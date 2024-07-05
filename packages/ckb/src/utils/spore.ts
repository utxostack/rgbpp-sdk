import * as ckbUtils from '@nervosnetwork/ckb-sdk-utils';
import { Cell as LumosCell } from '@ckb-lumos/base';
import { UnpackResult } from '@ckb-lumos/codec';
import {
  Action,
  assembleTransferSporeAction,
  assembleCobuildWitnessLayout,
  assembleCreateClusterAction,
  assembleCreateSporeAction,
  assembleTransferClusterAction,
} from '@spore-sdk/core/lib/cobuild/index.js';
import { u64ToLe } from './hex';
import { Hex, IndexerCell, SporesCreateCobuildParams } from '../types';
import { NoRgbppLiveCellError, RgbppSporeTypeMismatchError, RgbppUtxoBindMultiTypeAssetsError } from '../error';
import { isScriptEqual, isSporeTypeSupported } from './ckb-tx';

const { PERSONAL, blake2b, hexToBytes, serializeInput } = ckbUtils;

// Generate type id for cluster id
export const generateClusterId = (firstInput: CKBComponents.CellInput, firstOutputIndex: number) => {
  const input = hexToBytes(serializeInput(firstInput));
  const s = blake2b(32, null, null, PERSONAL);
  s.update(input);
  s.update(hexToBytes(`0x${u64ToLe(BigInt(firstOutputIndex))}`));
  return `0x${s.digest('hex')}`;
};

// Generate type id for spore id
export const generateSporeId = (firstInput: CKBComponents.CellInput, firstOutputIndex: number) => {
  return generateClusterId(firstInput, firstOutputIndex);
};

export const generateClusterCreateCoBuild = (
  clusterOutput: CKBComponents.CellOutput,
  clusterOutputData: Hex,
): string => {
  const output = {
    cellOutput: clusterOutput,
    data: clusterOutputData,
  } as LumosCell;
  const { actions } = assembleCreateClusterAction(output);
  return assembleCobuildWitnessLayout(actions);
};

export const generateSporeCreateCoBuild = ({
  sporeOutputs,
  sporeOutputsData,
  clusterCell,
  clusterOutputCell,
}: SporesCreateCobuildParams): string => {
  if (sporeOutputs.length !== sporeOutputsData.length) {
    throw new Error('The length of spore outputs and spore cell data are not same');
  }
  let sporeActions: UnpackResult<typeof Action>[] = [];

  // cluster transfer actions
  const clusterInput = {
    cellOutput: clusterCell.output,
    data: clusterCell.outputData,
  } as LumosCell;
  const clusterOutput = {
    cellOutput: clusterOutputCell,
    data: clusterCell.outputData,
  } as LumosCell;
  const { actions } = assembleTransferClusterAction(clusterInput, clusterOutput);
  sporeActions = sporeActions.concat(actions);

  // spores create actions
  for (let index = 0; index < sporeOutputs.length; index++) {
    const sporeOutput = {
      cellOutput: sporeOutputs[index],
      data: sporeOutputsData[index],
    } as LumosCell;
    const { actions } = assembleCreateSporeAction(sporeOutput);
    sporeActions = sporeActions.concat(actions);
  }
  return assembleCobuildWitnessLayout(sporeActions);
};

export const generateSporeTransferCoBuild = (
  sporeCells: IndexerCell[] | CKBComponents.LiveCell[],
  outputCells: CKBComponents.CellOutput[],
): string => {
  if (sporeCells.length !== outputCells.length) {
    throw new Error('The length of spore input cells and spore output cells are not same');
  }
  let sporeActions: UnpackResult<typeof Action>[] = [];
  for (let index = 0; index < sporeCells.length; index++) {
    const sporeCell = sporeCells[index];
    const outputData = 'outputData' in sporeCell ? sporeCell.outputData : sporeCell.data!.content!;
    const sporeInput = {
      cellOutput: sporeCells[index].output,
      data: outputData,
    } as LumosCell;
    const sporeOutput = {
      cellOutput: outputCells[index],
      data: outputData,
    } as LumosCell;
    const { actions } = assembleTransferSporeAction(sporeInput, sporeOutput);
    sporeActions = sporeActions.concat(actions);
  }
  return assembleCobuildWitnessLayout(sporeActions);
};

// Check the validity of RGB++ spore cells and throw an exception if the conditions are not met to avoid building invalid CKB TX
export const throwErrorWhenSporeCellsInvalid = (
  sporeCells: IndexerCell[] | undefined,
  sporeTypeBytes: Hex,
  isMainnet: boolean,
) => {
  if (!sporeCells || sporeCells.length === 0) {
    throw new NoRgbppLiveCellError('No spore rgbpp cells found with the spore rgbpp lock args');
  }
  if (sporeCells.length > 1) {
    throw new RgbppUtxoBindMultiTypeAssetsError('The BTC UTXO must not be bound to multiple CKB cells');
  }
  const sporeCell = sporeCells[0];

  if (!sporeCell.output.type) {
    throw new RgbppSporeTypeMismatchError('The cell with the rgbpp lock args has no spore asset');
  }

  if (!isSporeTypeSupported(sporeCell.output.type, isMainnet)) {
    throw new RgbppSporeTypeMismatchError('The cell type is not the supported spore type script');
  }

  if (!isScriptEqual(sporeCell.output.type, sporeTypeBytes)) {
    throw new RgbppSporeTypeMismatchError('The spore cell type with the rgbpp lock args does not match');
  }
};
