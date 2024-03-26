export interface BtcApis {
  getBtcBlockchainInfo(): Promise<BtcApiBlockchainInfo>;
  getBtcBlockByHash(blockHash: string): Promise<BtcApiBlock>;
  getBtcBlockHeaderByHash(blockHash: string): Promise<BtcApiBlockHeader>;
  getBtcBlockHashByHeight(blockHeight: number): Promise<BtcApiBlockHash>;
  getBtcBlockTransactionIdsByHash(blockHash: number): Promise<BtcApiBlockTransactionIds>;
  getBtcBalance(address: string, params?: BtcApiBalanceParams): Promise<BtcApiBalance>;
  getBtcUtxos(address: string, params?: BtcApiUtxoParams): Promise<BtcApiUtxo[]>;
  getBtcTransactions(address: string): Promise<BtcApiTransaction[]>;
  getBtcTransaction(txId: string): Promise<BtcApiTransaction>;
  sendBtcTransaction(txHex: string): Promise<BtcApiSentTransaction>;
}

export interface BtcApiBlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: number;
  difficulty: number;
  mediantime: number;
}

export interface BtcApiBlock {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
  merkle_root: string;
  previousblockhash: string;
  mediantime: number;
  nonce: number;
  bits: number;
  difficulty: number;
}

export interface BtcApiBlockHash {
  hash: string;
}

export interface BtcApiBlockHeader {
  header: string;
}

export interface BtcApiBlockTransactionIds {
  txids: string[];
}

export interface BtcApiBalanceParams {
  min_satoshi?: number;
}
export interface BtcApiBalance {
  address: string;
  satoshi: number;
  pending_satoshi: number;
  dust_satoshi: number;
  utxo_count: number;
}

export interface BtcApiUtxoParams {
  min_satoshi?: number;
}
export interface BtcApiUtxo {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
}

export interface BtcApiSentTransaction {
  txid: string;
}

export interface BtcApiTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: {
    txid: string;
    vout: number;
    prevout: {
      scriptpubkey: string;
      scriptpubkey_asm: string;
      scriptpubkey_type: string;
      scriptpubkey_address: string;
      value: number;
    };
    scriptsig: string;
    scriptsig_asm: string;
    witness: string[];
    is_coinbase: boolean;
    sequence: number;
  }[];
  vout: {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number;
  }[];
  weight: number;
  size: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
}
