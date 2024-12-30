import { IndexerCell } from '../types/collector';
import { Collector } from './index';
import { isScriptEqual } from '../utils/ckb-tx';
import { Hex } from '../types';
export interface CellWithStatus extends IndexerCell {
  status?: 'live';
  outputDataHash?: Hex;
}

export class OfflineCollector extends Collector {
  private cells: CellWithStatus[];

  constructor(cells: CellWithStatus[]) {
    super({ ckbNodeUrl: '', ckbIndexerUrl: '' });
    this.cells = cells;
  }

  getCkb(): never {
    throw new Error('OfflineCollector does not have a CKB instance');
  }

  async getCells({
    lock,
    type,
    isDataMustBeEmpty = true,
    outputCapacityRange,
  }: {
    lock?: CKBComponents.Script;
    type?: CKBComponents.Script;
    isDataMustBeEmpty?: boolean;
    outputCapacityRange?: Hex[];
  }): Promise<IndexerCell[]> {
    let cells: CellWithStatus[] = [];

    if (lock) {
      cells = this.cells.filter((cell) => isScriptEqual(cell.output.lock, lock));
    } else if (type) {
      cells = this.cells.filter((cell) => {
        if (!cell.output.type) {
          return false;
        }
        return isScriptEqual(cell.output.type, type);
      });
    }

    if (isDataMustBeEmpty && !type) {
      cells = cells.filter((cell) => cell.outputData === '0x' || cell.outputData === '');
    }

    if (outputCapacityRange) {
      if (outputCapacityRange.length === 2) {
        cells = cells.filter((cell) => {
          const capacity = BigInt(cell.output.capacity);
          return capacity >= BigInt(outputCapacityRange[0]) && capacity < BigInt(outputCapacityRange[1]);
        });
      } else {
        throw new Error('Invalid output capacity range');
      }
    }

    return cells.map((cell) => ({
      blockNumber: cell.blockNumber,
      outPoint: cell.outPoint,
      output: cell.output,
      outputData: cell.outputData,
      txIndex: cell.txIndex,
    }));
  }

  // https://github.com/nervosnetwork/ckb/blob/master/rpc/README.md#method-get_live_cell
  async getLiveCell(outPoint: CKBComponents.OutPoint, withData = true): Promise<CKBComponents.LiveCell> {
    const cell = this.cells.find((cell) => {
      if (cell.status === undefined) {
        return false;
      }

      return (
        outPoint.txHash === cell.outPoint.txHash && outPoint.index === cell.outPoint.index && cell.status === 'live'
      );
    });

    if (!cell) {
      throw new Error(
        `Cell corresponding to the outPoint: {txHash: ${outPoint.txHash}, index: ${outPoint.index}} not found`,
      );
    }

    return {
      output: cell.output,
      data: withData
        ? {
            content: cell.outputData,
            hash: cell.outputDataHash ?? '',
          }
        : undefined,
    };
  }

  async getLiveCells(outPoints: CKBComponents.OutPoint[], withData = false): Promise<CKBComponents.LiveCell[]> {
    return Promise.all(outPoints.map((outPoint) => this.getLiveCell(outPoint, withData)));
  }
}
