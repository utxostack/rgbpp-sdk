import { TransactionSkeletonType, createTransactionFromSkeleton } from '@ckb-lumos/helpers';
import { PERSONAL, blake2b, hexToBytes, serializeInput } from '@nervosnetwork/ckb-sdk-utils';
import { Cell as LumosCell } from '@ckb-lumos/base';
import {
  assembleTransferSporeAction,
  assembleCobuildWitnessLayout,
  assembleCreateClusterAction,
} from '@spore-sdk/core/lib/cobuild';
import { u64ToLe } from './hex';
import { Hex, IndexerCell } from '../types';

export const ckbTxFromTxSkeleton = (txSkeleton: TransactionSkeletonType): CKBComponents.RawTransaction => {
  return createTransactionFromSkeleton(txSkeleton) as CKBComponents.RawTransaction;
};

// Generate type id for cluster id
export const generateClusterId = (firstInput: CKBComponents.CellInput, firstOutputIndex: number) => {
  const input = hexToBytes(serializeInput(firstInput));
  const s = blake2b(32, null, null, PERSONAL);
  s.update(input);
  s.update(hexToBytes(`0x${u64ToLe(BigInt(firstOutputIndex))}`));
  return `0x${s.digest('hex')}`;
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

export const generateSporeTransferCoBuild = (
  sporeCells: IndexerCell[] | CKBComponents.LiveCell[],
  outputCells: CKBComponents.CellOutput[],
): string => {
  if (sporeCells.length !== outputCells.length) {
    throw new Error('The length of spore input cells length and spore output cells are not same');
  }
  let sporeActions: any[] = [];
  for (let index = 0; index < sporeCells.length; index++) {
    const sporeCell = sporeCells[index];
    const outputData = 'outputData' in sporeCell ? sporeCell.outputData : sporeCell.data?.content!;
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
