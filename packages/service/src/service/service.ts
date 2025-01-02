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
  BtcApiTransactionParams,
  BtcApiRecommendedFeeRates,
  RgbppApiActivityByAddressParams,
  RgbppApiActivity,
  RgbppAssetInfo,
} from '../types';
import {
  RgbppApis,
  RgbppCell,
  RgbppApiSpvProof,
  RgbppApiPaymasterInfo,
  RgbppApiTransactionState,
  RgbppApiSendCkbTransactionPayload,
  RgbppApiCkbTransactionHash,
  RgbppApiAssetsByAddressParams,
  RgbppApiBalanceByAddressParams,
  RgbppApiBalance,
  RgbppApiRetryCkbTransactionPayload,
  RgbppApiTransactionStateParams,
  RgbppApiTransactionRetry,
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

  getBtcRecommendedFeeRates() {
    return this.request<BtcApiRecommendedFeeRates>(`/bitcoin/v1/fees/recommended`);
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

  getBtcTransactions(address: string, params?: BtcApiTransactionParams) {
    return this.request<BtcApiTransaction[]>(`/bitcoin/v1/address/${address}/txs`, {
      params,
    });
  }

  getBtcTransaction(txId: string) {
    return this.request<BtcApiTransaction>(`/bitcoin/v1/transaction/${txId}`);
  }

  sendBtcTransaction(txHex: string) {
    return this.post<BtcApiSentTransaction>('/bitcoin/v1/transaction', {
      body: JSON.stringify({
        txhex: txHex,
      }),
    });
  }

  /**
   * RGBPP APIs, under the /rgbpp/v1 prefix.
   */

  getRgbppPaymasterInfo() {
    return this.request<RgbppApiPaymasterInfo>('/rgbpp/v1/paymaster/info');
  }

  getRgbppTransactionHash(btcTxId: string) {
    return this.request<RgbppApiCkbTransactionHash>(`/rgbpp/v1/transaction/${btcTxId}`);
  }

  getRgbppTransactionState(btcTxId: string, params?: RgbppApiTransactionStateParams) {
    return this.request<RgbppApiTransactionState>(`/rgbpp/v1/transaction/${btcTxId}/job`, {
      params,
    });
  }

  getRgbppAssetsByBtcTxId(btcTxId: string) {
    return this.request<RgbppCell[]>(`/rgbpp/v1/assets/${btcTxId}`);
  }

  getRgbppAssetsByBtcUtxo(btcTxId: string, vout: number) {
    return this.request<RgbppCell[]>(`/rgbpp/v1/assets/${btcTxId}/${vout}`);
  }

  getRgbppAssetInfoByTypeScript(typeScript: string) {
    return this.request<RgbppAssetInfo>('/rgbpp/v1/assets/type', {
      params: {
        type_script: typeScript,
      },
    });
  }

  getRgbppAssetsByBtcAddress(btcAddress: string, params?: RgbppApiAssetsByAddressParams) {
    return this.request<RgbppCell[]>(`/rgbpp/v1/address/${btcAddress}/assets`, {
      params,
    });
  }

  getRgbppBalanceByBtcAddress(btcAddress: string, params?: RgbppApiBalanceByAddressParams) {
    return this.request<RgbppApiBalance>(`/rgbpp/v1/address/${btcAddress}/balance`, {
      params,
    });
  }

  getRgbppActivityByBtcAddress(btcAddress: string, params?: RgbppApiActivityByAddressParams) {
    return this.request<RgbppApiActivity>(`/rgbpp/v1/address/${btcAddress}/activity`, {
      params,
    });
  }

  getRgbppSpvProof(btcTxId: string, confirmations: number) {
    return this.request<RgbppApiSpvProof>('/rgbpp/v1/btc-spv/proof', {
      params: {
        btc_txid: btcTxId,
        confirmations,
      },
    });
  }

  sendRgbppCkbTransaction(payload: RgbppApiSendCkbTransactionPayload) {
    return this.post<RgbppApiTransactionState>('/rgbpp/v1/transaction/ckb-tx', {
      body: JSON.stringify(payload),
    });
  }

  retryRgbppCkbTransaction(payload: RgbppApiRetryCkbTransactionPayload) {
    return this.post<RgbppApiTransactionRetry>('/rgbpp/v1/transaction/retry', {
      body: JSON.stringify(payload),
    });
  }
}
