import { PERSONAL, blake2b, hexToBytes, serializeInput } from '@nervosnetwork/ckb-sdk-utils';
import { Cell as LumosCell } from '@ckb-lumos/base';
import {
  assembleTransferSporeAction,
  assembleCobuildWitnessLayout,
  assembleCreateClusterAction,
  assembleCreateSporeAction,
  assembleTransferClusterAction,
} from '@spore-sdk/core/lib/cobuild';
import { u64ToLe } from './hex';
import { Hex, IndexerCell, SporesCreateCobuildParams } from '../types';

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
  let sporeActions: any[] = [];

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
  sporeCell: IndexerCell | CKBComponents.LiveCell,
  outputCell: CKBComponents.CellOutput,
): string => {
  const outputData = 'outputData' in sporeCell ? sporeCell.outputData : sporeCell.data?.content!;
  const sporeInput = {
    cellOutput: sporeCell.output,
    data: outputData,
  } as LumosCell;
  const sporeOutput = {
    cellOutput: outputCell,
    data: outputData,
  } as LumosCell;
  const { actions } = assembleTransferSporeAction(sporeInput, sporeOutput);
  return assembleCobuildWitnessLayout(actions);
};
