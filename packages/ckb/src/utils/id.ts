import { Hash, HexNumber, OutPoint, blockchain } from '@ckb-lumos/base';
import { InvalidCellIdError } from '../error';
import { append0x } from './hex';

export const encodeCellId = (txHash: Hash, index: HexNumber): string => {
  if (!txHash.startsWith('0x') || !index.startsWith('0x')) {
    throw new InvalidCellIdError(`Cannot encode CellId due to valid format: txHash=${txHash}, index=${index}`);
  }
  try {
    blockchain.OutPoint.pack({
      txHash,
      index,
    });
    return `${txHash}:${index}`;
  } catch {
    throw new InvalidCellIdError(`Cannot encode CellId due to valid format: txHash=${txHash}, index=${index}`);
  }
};

export const decodeCellId = (cellId: string): OutPoint => {
  const [txHash, index] = cellId.split(':');
  if (!txHash.startsWith('0x') || !index.startsWith('0x')) {
    throw new InvalidCellIdError(`Cannot decode CellId: ${cellId}`);
  }
  try {
    blockchain.OutPoint.pack({
      txHash,
      index,
    });
    return {
      txHash: append0x(txHash),
      index: append0x(index),
    };
  } catch {
    throw new InvalidCellIdError(`Cannot decode CellId due to valid format: ${cellId}`);
  }
};
