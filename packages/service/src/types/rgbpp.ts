import { Cell, Hash, Script } from '@ckb-lumos/base';
import { BtcApiTransaction } from './btc';

export interface RgbppApis {
  getRgbppPaymasterInfo(): Promise<RgbppApiPaymasterInfo>;
  getRgbppTransactionHash(btcTxId: string): Promise<RgbppApiCkbTransactionHash>;
  getRgbppTransactionState(btcTxId: string): Promise<RgbppApiTransactionState>;
  getRgbppAssetsByBtcTxId(btcTxId: string): Promise<RgbppCell[]>;
  getRgbppAssetsByBtcUtxo(btcTxId: string, vout: number): Promise<RgbppCell[]>;
  getRgbppAssetsByBtcAddress(btcAddress: string, params?: RgbppApiAssetsByAddressParams): Promise<RgbppCell[]>;
  getRgbppBalanceByBtcAddress(btcAddress: string, params?: RgbppApiBalanceByAddressParams): Promise<RgbppApiBalance>;
  getRgbppActivityByBtcAddress(btcAddress: string, params?: RgbppApiActivityByAddressParams): Promise<RgbppApiActivity>;
  getRgbppSpvProof(btcTxId: string, confirmations: number): Promise<RgbppApiSpvProof>;
  sendRgbppCkbTransaction(payload: RgbppApiSendCkbTransactionPayload): Promise<RgbppApiTransactionState>;
  retryRgbppCkbTransaction(payload: RgbppApiRetryCkbTransactionPayload): Promise<RgbppApiTransactionRetry>;
}

export type RgbppTransactionState = 'completed' | 'failed' | 'delayed' | 'active' | 'waiting';

export interface RgbppApiPaymasterInfo {
  btc_address: string;
  fee: number;
}

export interface RgbppApiCkbTransactionHash {
  txhash: string;
}

export interface RgbppApiTransactionStateParams {
  with_data?: boolean;
}

export interface RgbppApiTransactionState {
  state: RgbppTransactionState;
  attempts: number;
  failedReason?: string;
  data?: {
    txid: string;
    ckbVirtualResult: {
      ckbRawTx: CKBComponents.RawTransaction;
      needPaymasterCell: boolean;
      sumInputsCapacity: string;
      commitment: string;
    };
  };
}

export interface RgbppCell extends Cell {
  typeHash?: Hash;
}

export interface RgbppApiAssetsByAddressParams {
  type_script?: string;
  no_cache?: boolean;
}

export interface RgbppApiBalanceByAddressParams {
  type_script?: string;
  no_cache?: boolean;
}
export interface RgbppApiBalance {
  address: string;
  xudt: RgbppApiXudtBalance[];
}
export interface RgbppApiXudtBalance {
  name: string;
  decimal: number;
  symbol: string;
  total_amount: string;
  available_amount: string;
  pending_amount: string;
  type_hash: string;
  type_script: Script;
}

export interface RgbppApiActivityByAddressParams {
  rgbpp_only?: boolean;
  type_script?: string;
  after_btc_txid?: string;
}
export interface RgbppApiActivity {
  address: string;
  cursor: string;
  txs: {
    btcTx: BtcApiTransaction;
    isRgbpp: boolean;
    isomorphicTx?: {
      ckbVirtualTx?: CKBComponents.RawTransaction;
      ckbTx?: CKBComponents.Transaction;
      inputs?: CKBComponents.CellOutput[];
      outputs?: CKBComponents.CellOutput[];
      status: {
        confirmed: boolean;
      };
    };
  }[];
}

export interface RgbppApiSpvProof {
  proof: string;
  spv_client: {
    tx_hash: string;
    index: string;
  };
}

export interface RgbppApiSendCkbTransactionPayload {
  btc_txid: string;
  // Support ckbVirtualTxResult and it's JSON string as request parameter
  ckb_virtual_result: RgbppApiSendCkbVirtualResult | string;
}
export interface RgbppApiSendCkbVirtualResult {
  ckbRawTx: CKBComponents.RawTransaction;
  needPaymasterCell: boolean;
  sumInputsCapacity: string;
  commitment: string;
}

export interface RgbppApiRetryCkbTransactionPayload {
  btc_txid: string;
}

export interface RgbppApiTransactionRetry {
  success: boolean;
  state: RgbppTransactionState;
}
