import { Hex } from './common';

export interface SpvClientCellTxProofReq {
  // The BTC transaction id
  btcTxId: Hex;
  // The position of this transaction in the block
  btcTxIndexInBlock: number;
  // The BTC confirmation blocks
  confirmBlocks: number;
}

export interface SpvClientCellTxProofResponse {
  // The OutPoint of spv client cell
  spvClient: CKBComponents.OutPoint;
  // The BTC transaction proof
  proof: Hex;
}
