import { Hex } from './common';
import { BaseCkbVirtualTxResult } from './rgbpp';

export interface AppendRgppTxRequest {
  txid: Hex;
  ckbVirtualResult: BaseCkbVirtualTxResult;
}

export interface AppendRgppTxResp {
  state: string;
}

/**
 * completed: The CKB transaction has been sent and confirmed.
 * failed: Something went wrong during the process, and it has failed.
 * delayed: The transaction has not been confirmed yet and is waiting for confirmation.
 * active: The transaction is currently being processed.
 * waiting: The transaction is pending and is waiting to be processed.
 */
export type RgbppTxState = 'completed' | 'failed' | 'delayed' | 'active' | 'waiting';
export interface CheckRgppTxResp {
  ckbTxHash: string;
  state: RgbppTxState;
}
