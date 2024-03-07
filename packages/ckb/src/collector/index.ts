import axios from 'axios';
import CKB from '@nervosnetwork/ckb-sdk-core';
import { toCamelcase } from '../utils/case-parser';
import { CollectResult, CollectUdtResult, IndexerCell } from '../types/collector';
import { MIN_CAPACITY } from '../constants';
import { CapacityNotEnoughError, IndexerError, UdtAmountNotEnoughError } from '../error';
import { leToU128 } from '../utils';

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
  }: {
    lock?: CKBComponents.Script;
    type?: CKBComponents.Script;
  }): Promise<IndexerCell[] | undefined> {
    let param: any = {
      script_search_mode: 'exact',
    };
    if (lock) {
      const filter = type
        ? {
            script: parseScript(type),
          }
        : {
            script: null,
            output_data_len_range: ['0x0', '0x1'],
          };
      param = {
        ...param,
        script: parseScript(lock),
        script_type: 'lock',
        filter,
      };
    } else if (type) {
      param = {
        ...param,
        script: parseScript(type),
        script_type: 'type',
      };
    }
    let payload = {
      id: 1,
      jsonrpc: '2.0',
      method: 'get_cells',
      params: [param, 'asc', '0x3E8'],
    };
    const body = JSON.stringify(payload, null, '  ');
    let response = (
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

  collectInputs(
    liveCells: IndexerCell[],
    needCapacity: bigint,
    fee: bigint,
    minCapacity?: bigint,
    errMsg?: string,
  ): CollectResult {
    const changeCapacity = minCapacity ?? MIN_CAPACITY;
    let inputs: CKBComponents.CellInput[] = [];
    let sum = BigInt(0);
    for (let cell of liveCells) {
      inputs.push({
        previousOutput: {
          txHash: cell.outPoint.txHash,
          index: cell.outPoint.index,
        },
        since: '0x0',
      });
      sum = sum + BigInt(cell.output.capacity);
      if (sum >= needCapacity + changeCapacity + fee) {
        break;
      }
    }
    if (sum < needCapacity + changeCapacity + fee) {
      const message = errMsg ?? 'Insufficient free CKB balance';
      throw new CapacityNotEnoughError(message);
    }
    return { inputs, capacity: sum };
  }

  collectUdtInputs(liveCells: IndexerCell[], needAmount: bigint): CollectUdtResult {
    let inputs: CKBComponents.CellInput[] = [];
    let sumCapacity = BigInt(0);
    let sumAmount = BigInt(0);
    for (let cell of liveCells) {
      inputs.push({
        previousOutput: {
          txHash: cell.outPoint.txHash,
          index: cell.outPoint.index,
        },
        since: '0x0',
      });
      sumCapacity = sumCapacity + BigInt(cell.output.capacity);
      sumAmount += leToU128(cell.outputData);
      if (sumAmount >= needAmount) {
        break;
      }
    }
    if (sumAmount < needAmount) {
      throw new UdtAmountNotEnoughError('Insufficient UDT balance');
    }
    return { inputs, capacity: sumCapacity, amount: sumAmount };
  }

  async getLiveCell(outPoint: CKBComponents.OutPoint): Promise<CKBComponents.LiveCell> {
    const ckb = new CKB(this.ckbNodeUrl);
    const { cell } = await ckb.rpc.getLiveCell(outPoint, true);
    return cell;
  }
}
