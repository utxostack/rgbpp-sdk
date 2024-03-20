import axios from 'axios';
import { SpvClientCellTxProofReq, SpvClientCellTxProofResponse } from '../types/spv';
import { SpvRpcError } from '../error';
import { remove0x, toCamelcase } from '../utils';

export class SPVService {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  fetchSpvClientCellAndTxProof = async ({
    btcTxId,
    btcTxIndexInBlock,
    confirmBlocks,
  }: SpvClientCellTxProofReq): Promise<SpvClientCellTxProofResponse> => {
    let payload = {
      id: Math.floor(Math.random() * 100000),
      jsonrpc: '2.0',
      method: 'getTxProof',
      params: [remove0x(btcTxId), btcTxIndexInBlock, confirmBlocks],
    };
    const body = JSON.stringify(payload, null, '  ');
    const response = await axios({
      method: 'post',
      url: this.url,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 20000,
      data: body,
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      throw new SpvRpcError('Fetch SPV client cell and tx proof error');
    } else {
      return toCamelcase(data.result);
    }
  };
}

export const buildSpvClientCellDep = (spvClient: CKBComponents.OutPoint) => {
  const cellDep: CKBComponents.CellDep = {
    outPoint: spvClient,
    depType: 'code',
  };
  return cellDep;
};
