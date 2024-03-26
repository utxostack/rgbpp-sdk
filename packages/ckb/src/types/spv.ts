import { Hex } from './common';

export interface SpvClientCellTxProof {
  // The OutPoint of spv client cell
  spvClient: CKBComponents.OutPoint;
  // The BTC transaction proof
  proof: Hex;
}
