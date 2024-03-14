import { Hex } from './common';

export interface SpvClientCellTxProofReq {
  // The SPV Service url
  spvServiceUrl: string;
  // The BTC transaction id
  btcTxId: Hex;
  // The BTC confirmation blocks
  confirmBlocks: number;
}

export interface SpvClientCellTxProofResponse {
  // The OutPoint of spv client cell
  spvClient: string;
  // The BTC transaction proof
  proof: Hex;
}
