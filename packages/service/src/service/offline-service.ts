import { ErrorCodes } from '../error';
import { BtcAssetsApi } from './service';
import { OfflineBtcAssetsDataSourceError } from '../error';

import {
  BtcApiTransaction,
  BtcApiUtxo,
  BtcApiUtxoParams,
  BtcApiTransactionParams,
  BtcApiBalanceParams,
  RgbppApiTransactionStateParams,
  RgbppApiAssetsByAddressParams,
  RgbppApiBalanceByAddressParams,
  RgbppApiActivityByAddressParams,
  RgbppApiSendCkbTransactionPayload,
  RgbppApiRetryCkbTransactionPayload,
  OfflineBtcUtxo,
} from '../types';

export interface OfflineBtcData {
  txs: BtcApiTransaction[];
  utxos: OfflineBtcUtxo[];
}

/*
 * Currently, the offline mode is only suitable for scenarios where you prefer to manually provide transactions and UTXOs data to build BTC transactions,
 * as its implemented methods are limited. If you require access to the full range of functionalities, such as advanced queries or sending transactions,
 * consider switching to BtcAssetsApi instead.
 */
export class OfflineBtcAssetsDataSource extends BtcAssetsApi {
  // txid -> tx
  private txs: Record<string, BtcApiTransaction>;
  // address -> utxos
  private utxos: Record<string, OfflineBtcUtxo[]>;

  constructor(offlineData: OfflineBtcData) {
    super({ url: 'DUMMY_URL' });

    this.txs = offlineData.txs.reduce(
      (acc, tx) => {
        acc[tx.txid] = tx;
        return acc;
      },
      {} as Record<string, BtcApiTransaction>,
    );

    this.utxos = offlineData.utxos.reduce(
      (acc, utxo) => {
        acc[utxo.address] = [...(acc[utxo.address] ?? []), utxo];
        return acc;
      },
      {} as Record<string, OfflineBtcUtxo[]>,
    );
  }

  getBtcTransaction(txId: string): Promise<BtcApiTransaction> {
    return Promise.resolve(this.txs[txId]);
  }

  getBtcUtxos(address: string, params?: BtcApiUtxoParams): Promise<BtcApiUtxo[]> {
    const addressUtxos = this.utxos[address] || [];
    const { only_non_rgbpp_utxos, only_confirmed, min_satoshi } = params || {};

    return Promise.resolve(
      addressUtxos.filter(
        (utxo) =>
          (!only_non_rgbpp_utxos || utxo.nonRgbpp) &&
          (!only_confirmed || utxo.status.confirmed) &&
          (!min_satoshi || utxo.value >= min_satoshi),
      ),
    );
  }

  /*
   * The following methods are not available in offline mode.
   */

  getBtcRecommendedFeeRates() {
    return Promise.reject(
      new OfflineBtcAssetsDataSourceError(
        ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE,
        'Recommended fee rate is not available in offline mode. You must explicitly provide a fee rate.',
      ),
    );
  }

  getRgbppPaymasterInfo() {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getBtcBlockchainInfo() {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */

  getBtcBlockByHash(blockHash: string) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getBtcBlockHeaderByHash(blockHash: string) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getBtcBlockHashByHeight(height: number) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getBtcBlockTransactionIdsByHash(blockHash: number) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getBtcBalance(address: string, params?: BtcApiBalanceParams) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getBtcTransactions(address: string, params?: BtcApiTransactionParams) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  sendBtcTransaction(txHex: string) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getRgbppTransactionHash(btcTxId: string) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getRgbppTransactionState(btcTxId: string, params?: RgbppApiTransactionStateParams) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getRgbppAssetsByBtcTxId(btcTxId: string) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getRgbppAssetsByBtcUtxo(btcTxId: string, vout: number) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getRgbppAssetInfoByTypeScript(typeScript: string) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getRgbppAssetsByBtcAddress(btcAddress: string, params?: RgbppApiAssetsByAddressParams) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getRgbppBalanceByBtcAddress(btcAddress: string, params?: RgbppApiBalanceByAddressParams) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getRgbppActivityByBtcAddress(btcAddress: string, params?: RgbppApiActivityByAddressParams) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  getRgbppSpvProof(btcTxId: string, confirmations: number) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  sendRgbppCkbTransaction(payload: RgbppApiSendCkbTransactionPayload) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }

  retryRgbppCkbTransaction(payload: RgbppApiRetryCkbTransactionPayload) {
    return Promise.reject(new OfflineBtcAssetsDataSourceError(ErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE));
  }
}
