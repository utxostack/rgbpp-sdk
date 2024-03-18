import { Hex } from './common';
import { BaseCkbVirtualTxResult } from './rgbpp';

export interface AppendRgppTxRequest {
  txid: Hex;
  ckbVirtualResult: BaseCkbVirtualTxResult;
}

export interface AppendRgppTxResp {
  state: string;
}

export interface CheckRgppTxResp {
  ckbTxHash: string;
  state: Hex;
}
