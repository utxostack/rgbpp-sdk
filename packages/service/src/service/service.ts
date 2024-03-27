import { Cell } from '@ckb-lumos/lumos';
import { BtcAssetsApiBase } from './base';
import {
  BtcApis,
  BtcApiBalance,
  BtcApiBalanceParams,
  BtcApiBlock,
  BtcApiBlockchainInfo,
  BtcApiBlockHash,
  BtcApiBlockHeader,
  BtcApiBlockTransactionIds,
  BtcApiSentTransaction,
  BtcApiTransaction,
  BtcApiUtxo,
  BtcApiUtxoParams,
} from '../types';
import {
  RgbppApis,
  RgbppApiSpvProof,
  RgbppApiTransactionState,
  RgbppApiSendCkbTransactionPayload,
  RgbppApiCkbTransactionHash,
  RgbppApiAssetsByAddressParams,
} from '../types';

export class BtcAssetsApi extends BtcAssetsApiBase implements BtcApis, RgbppApis {
  /**
   * Base
   */

  static fromToken(url: string, token: string, origin?: string) {
    return new BtcAssetsApi({ url, token, origin });
  }

  /**
   * Bitcoin APIs, under the /bitcoin/v1 prefix.
   */

  getBtcBlockchainInfo() {
    return this.request<BtcApiBlockchainInfo>('/bitcoin/v1/info');
  }

  getBtcBlockByHash(blockHash: string) {
    return this.request<BtcApiBlock>(`/bitcoin/v1/block/${blockHash}`);
  }

  getBtcBlockHeaderByHash(blockHash: string) {
    return this.request<BtcApiBlockHeader>(`/bitcoin/v1/block/${blockHash}/header`);
  }

  getBtcBlockHashByHeight(height: number) {
    return this.request<BtcApiBlockHash>(`/bitcoin/v1/block/height/${height}`);
  }

  getBtcBlockTransactionIdsByHash(blockHash: number) {
    return this.request<BtcApiBlockTransactionIds>(`/bitcoin/v1/block/${blockHash}/txids`);
  }

  getBtcBalance(address: string, params?: BtcApiBalanceParams) {
    return this.request<BtcApiBalance>(`/bitcoin/v1/address/${address}/balance`, {
      params,
    });
  }

  getBtcUtxos(address: string, params?: BtcApiUtxoParams) {
    return this.request<BtcApiUtxo[]>(`/bitcoin/v1/address/${address}/unspent`, {
      params,
    });
  }

  getBtcTransactions(address: string) {
    return this.request<BtcApiTransaction[]>(`/bitcoin/v1/address/${address}/txs`);
  }

  getBtcTransaction(txId: string) {
    return this.request<BtcApiTransaction>(`/bitcoin/v1/transaction/${txId}`);
  }

  sendBtcTransaction(txHex: string) {
    return this.post<BtcApiSentTransaction>('/bitcoin/v1/transaction', {
      body: JSON.stringify({
        txHex,
      }),
    });
  }

  /**
   * RGBPP APIs, under the /rgbpp/v1 prefix.
   */

  getRgbppTransactionHash(btcTxId: string) {
    return this.request<RgbppApiCkbTransactionHash | undefined>(`/rgbpp/v1/transaction/${btcTxId}`, {
      allow404: true,
    });
  }

  getRgbppTransactionState(btcTxId: string) {
    return this.request<RgbppApiTransactionState | undefined>(`/rgbpp/v1/transaction/${btcTxId}/job`, {
      allow404: true,
    });
  }

  getRgbppAssetsByBtcTxId(btcTxId: string) {
    return this.request<Cell[]>(`/rgbpp/v1/assets/${btcTxId}`);
  }

  getRgbppAssetsByBtcUtxo(btcTxId: string, vout: number) {
    return this.request<Cell[]>(`/rgbpp/v1/assets/${btcTxId}/${vout}`);
  }

  getRgbppAssetsByBtcAddress(btcAddress: string, params?: RgbppApiAssetsByAddressParams) {
    return this.request<Cell[]>(`/rgbpp/v1/address/${btcAddress}/assets`, {
      params,
    });
  }

  getRgbppSpvProof(btcTxId: string, confirmations: number) {
    return this.request<RgbppApiSpvProof | undefined>('/rgbpp/v1/btc-spv/proof', {
      allow404: true,
      params: {
        txid: btcTxId,
        confirmations,
      },
    });
  }

  sendRgbppCkbTransaction(payload: RgbppApiSendCkbTransactionPayload): Promise<RgbppApiTransactionState> {
    return this.post<RgbppApiTransactionState>('/rgbpp/v1/transaction/ckb-tx', {
      body: JSON.stringify(payload),
    });
  }
}
