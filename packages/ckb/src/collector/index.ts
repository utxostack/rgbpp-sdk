import axios from 'axios';
import CKB from '@nervosnetwork/ckb-sdk-core';
import { toCamelcase } from '../utils/case-parser';
import { CollectConfig, CollectResult, CollectUdtResult, IndexerCell } from '../types/collector';
import { MIN_CAPACITY } from '../constants';
import { CapacityNotEnoughError, IndexerError, UdtAmountNotEnoughError } from '../error';
import { isRgbppLockCellIgnoreChain, leToU128 } from '../utils';
import { Hex } from '../types';

const parseScript = (script: CKBComponents.Script) => ({
  code_hash: script.codeHash,
  hash_type: script.hashType,
  args: script.args,
});

export class Collector {
  private ckbNodeUrl: string;
  private ckbIndexerUrl: string;

  constructor({ ckbNodeUrl, ckbIndexerUrl }: { ckbNodeUrl: string; ckbIndexerUrl: string }) {
    this.ckbNodeUrl = ckbNodeUrl;
    this.ckbIndexerUrl = ckbIndexerUrl;
  }

  getCkb() {
    return new CKB(this.ckbNodeUrl);
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
  }): Promise<IndexerCell[] | undefined> {
    let param: unknown = {
      script_search_mode: 'exact',
    };
    if (lock) {
      param = {
        ...param!,
        script: parseScript(lock),
        script_type: 'lock',
        filter: {
          script: type ? parseScript(type) : null,
          output_data_len_range: isDataMustBeEmpty && !type ? ['0x0', '0x1'] : null,
          output_capacity_range: outputCapacityRange,
        },
      };
    } else if (type) {
      param = {
        ...param!,
        script: parseScript(type),
        script_type: 'type',
      };
    }
    const payload = {
      id: Math.floor(Math.random() * 100000),
      jsonrpc: '2.0',
      method: 'get_cells',
      params: [param, 'asc', '0x3E8'],
    };
    const body = JSON.stringify(payload, null, '  ');
    const response = (
      await axios({
        method: 'post',
        url: this.ckbIndexerUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 20000,
        data: body,
      })
    ).data;
    if (response.error) {
      console.error(response.error);
      throw new IndexerError('Get cells error');
    } else {
      return toCamelcase(response.result.objects);
    }
  }

  collectInputs(liveCells: IndexerCell[], needCapacity: bigint, fee: bigint, config?: CollectConfig): CollectResult {
    const changeCapacity = config?.minCapacity ?? MIN_CAPACITY;
    const inputs: CKBComponents.CellInput[] = [];
    let sumInputsCapacity = BigInt(0);
    for (const cell of liveCells) {
      inputs.push({
        previousOutput: {
          txHash: cell.outPoint.txHash,
          index: cell.outPoint.index,
        },
        since: '0x0',
      });
      sumInputsCapacity += BigInt(cell.output.capacity);
      if (sumInputsCapacity >= needCapacity + changeCapacity + fee && !config?.isMax) {
        break;
      }
    }
    if (sumInputsCapacity < needCapacity + changeCapacity + fee) {
      const message = config?.errMsg ?? 'Insufficient free CKB balance';
      throw new CapacityNotEnoughError(message);
    }
    return { inputs, sumInputsCapacity };
  }

  collectUdtInputs({ liveCells, needAmount }: { liveCells: IndexerCell[]; needAmount: bigint }): CollectUdtResult {
    const inputs: CKBComponents.CellInput[] = [];
    let sumInputsCapacity = BigInt(0);
    let sumAmount = BigInt(0);
    const isRgbppLock = liveCells.length > 0 && isRgbppLockCellIgnoreChain(liveCells[0].output);
    for (const cell of liveCells) {
      inputs.push({
        previousOutput: {
          txHash: cell.outPoint.txHash,
          index: cell.outPoint.index,
        },
        since: '0x0',
      });
      sumInputsCapacity = sumInputsCapacity + BigInt(cell.output.capacity);
      sumAmount += leToU128(cell.outputData);
      if (sumAmount >= needAmount && !isRgbppLock) {
        break;
      }
    }
    if (sumAmount < needAmount) {
      throw new UdtAmountNotEnoughError('Insufficient UDT balance');
    }
    return { inputs, sumInputsCapacity, sumAmount };
  }

  async getLiveCell(outPoint: CKBComponents.OutPoint): Promise<CKBComponents.LiveCell> {
    const ckb = new CKB(this.ckbNodeUrl);
    const { cell } = await ckb.rpc.getLiveCell(outPoint, true);
    return cell;
  }
}
