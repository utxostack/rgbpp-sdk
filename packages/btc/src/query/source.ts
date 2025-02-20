import {
  BtcApiUtxoParams,
  BtcAssetsApi,
  BtcAssetsApiError,
  ErrorCodes as ServiceErrorCodes,
  OfflineBtcAssetsDataSourceError,
  BtcApiRecommendedFeeRates,
} from '@rgbpp-sdk/service';
import { BaseOutput, Output, Utxo } from '../transaction/utxo';
import { NetworkType } from '../preset/types';
import { ErrorCodes, TxBuildError } from '../error';
import { TxAddressOutput } from '../transaction/build';
import { isOpReturnScriptPubkey } from '../transaction/embed';
import { addressToScriptPublicKeyHex, getAddressType } from '../address';
import { remove0x } from '../utils';
import { DataCache } from './cache';

export class DataSource {
  public cache: DataCache;
  public service: BtcAssetsApi;
  public networkType: NetworkType;

  constructor(service: BtcAssetsApi, networkType: NetworkType) {
    this.service = service;
    this.networkType = networkType;
    this.cache = new DataCache();
  }

  // Query a UTXO from the service.
  // Will throw error if the target output is unspendable.
  // When set "confirmed = true", will throw error if the output is unconfirmed.
  async getUtxo(hash: string, index: number, requireConfirmed?: boolean): Promise<Utxo | undefined> {
    const output = await this.getOutput(hash, index, requireConfirmed);
    if (output && !('address' in output)) {
      throw TxBuildError.withComment(ErrorCodes.UNSPENDABLE_OUTPUT, `hash: ${hash}, index: ${index}`);
    }

    return output;
  }

  // Query an output from the service.
  // Both unspent or unspendable output can be queried from the API.
  // When set "confirmed = true", will throw error if the output is unconfirmed.
  async getOutput(hash: string, index: number, requireConfirmed?: boolean): Promise<Output | Utxo | undefined> {
    const txId = remove0x(hash);
    const tx = await this.service.getBtcTransaction(txId);
    if (!tx) {
      return undefined;
    }
    if (requireConfirmed && !tx.status.confirmed) {
      throw TxBuildError.withComment(ErrorCodes.UNCONFIRMED_UTXO, `hash: ${hash}, index: ${index}`);
    }
    const vout = tx.vout[index];
    if (!vout) {
      return undefined;
    }

    const scriptBuffer = Buffer.from(vout.scriptpubkey, 'hex');
    if (isOpReturnScriptPubkey(scriptBuffer)) {
      return {
        txid: txId,
        vout: index,
        value: vout.value,
        scriptPk: vout.scriptpubkey,
      } as Output;
    }

    return {
      txid: txId,
      vout: index,
      value: vout.value,
      scriptPk: vout.scriptpubkey,
      address: vout.scriptpubkey_address,
      addressType: getAddressType(vout.scriptpubkey_address),
    } as Utxo;
  }

  async isTransactionConfirmed(hash: string): Promise<boolean> {
    const tx = await this.service.getBtcTransaction(remove0x(hash));
    return tx.status.confirmed;
  }

  async getUtxos(address: string, params?: BtcApiUtxoParams): Promise<Utxo[]> {
    const utxos = await this.service.getBtcUtxos(address, params);

    const scriptPk = addressToScriptPublicKeyHex(address, this.networkType);
    return utxos
      .sort((a, b) => {
        const aBlockHeight = a.status.block_height;
        const bBlockHeight = b.status.block_height;
        if (aBlockHeight !== bBlockHeight) {
          return aBlockHeight - bBlockHeight;
        }
        return a.vout - b.vout;
      })
      .map((row): Utxo => {
        return {
          address,
          scriptPk,
          txid: row.txid,
          vout: row.vout,
          value: row.value,
          addressType: getAddressType(address),
        };
      });
  }

  async collectSatoshi(props: {
    address: string;
    targetAmount: number;
    minUtxoSatoshi?: number;
    allowInsufficient?: boolean;
    onlyNonRgbppUtxos?: boolean;
    onlyConfirmedUtxos?: boolean;
    noAssetsApiCache?: boolean;
    internalCacheKey?: string;
    excludeUtxos?: BaseOutput[];
  }): Promise<{
    utxos: Utxo[];
    satoshi: number;
    exceedSatoshi: number;
  }> {
    const allowInsufficient = props.allowInsufficient ?? false;
    const excludeUtxos = props.excludeUtxos ?? [];

    const utxos = await this.cache.optionalCacheUtxos({
      key: props.internalCacheKey,
      getter: () =>
        this.getUtxos(props.address, {
          only_non_rgbpp_utxos: props.onlyNonRgbppUtxos,
          only_confirmed: props.onlyConfirmedUtxos,
          min_satoshi: props.minUtxoSatoshi,
          no_cache: props.noAssetsApiCache,
        }),
    });

    const collected = [];
    let collectedAmount = 0;
    for (const utxo of utxos) {
      if (collectedAmount >= props.targetAmount) {
        break;
      }
      if (excludeUtxos.length > 0) {
        const excluded = excludeUtxos.find((exclude) => {
          return exclude.txid === utxo.txid && exclude.vout === utxo.vout;
        });
        if (excluded) {
          continue;
        }
      }
      collected.push(utxo);
      collectedAmount += utxo.value;
    }

    if (!allowInsufficient && collectedAmount < props.targetAmount) {
      throw TxBuildError.withComment(
        ErrorCodes.INSUFFICIENT_UTXO,
        `expected: ${props.targetAmount}, actual: ${collectedAmount}`,
      );
    }

    return {
      utxos: collected,
      satoshi: collectedAmount,
      exceedSatoshi: collectedAmount - props.targetAmount,
    };
  }

  async getPaymasterOutput(): Promise<TxAddressOutput | undefined> {
    try {
      const paymasterInfo = await this.service.getRgbppPaymasterInfo();
      return {
        address: paymasterInfo.btc_address,
        value: paymasterInfo.fee,
      };
    } catch (err) {
      if (err instanceof BtcAssetsApiError && err.code === ServiceErrorCodes.ASSETS_API_RESOURCE_NOT_FOUND) {
        return undefined;
      } else if (
        err instanceof OfflineBtcAssetsDataSourceError &&
        err.code === ServiceErrorCodes.OFFLINE_DATA_SOURCE_METHOD_NOT_AVAILABLE
      ) {
        return undefined;
      }
      throw err;
    }
  }

  async getBtcRecommendedFeeRates(): Promise<BtcApiRecommendedFeeRates> {
    return this.service.getBtcRecommendedFeeRates();
  }
}
