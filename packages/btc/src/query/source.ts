import { FeesRecommended } from '@mempool/mempool.js/lib/interfaces/bitcoin/fees';
import { BtcApiUtxoParams, BtcAssetsApi, BtcAssetsApiError, ErrorCodes as ServiceErrorCodes } from '@rgbpp-sdk/service';
import { Output, Utxo } from '../transaction/utxo';
import { NetworkType } from '../preset/types';
import { ErrorCodes, TxBuildError } from '../error';
import { isOpReturnScriptPubkey } from '../transaction/embed';
import { addressToScriptPublicKeyHex, getAddressType } from '../address';
import { createMempool, MempoolInstance } from './mempool';
import { remove0x } from '../utils';
import { TxAddressOutput } from '../transaction/build';

export class DataSource {
  public service: BtcAssetsApi;
  public networkType: NetworkType;
  public mempool: MempoolInstance;

  constructor(service: BtcAssetsApi, networkType: NetworkType) {
    this.service = service;
    this.networkType = networkType;
    this.mempool = createMempool(networkType);
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
      return void 0;
    }
    if (requireConfirmed && !tx.status.confirmed) {
      throw TxBuildError.withComment(ErrorCodes.UNCONFIRMED_UTXO, `hash: ${hash}, index: ${index}`);
    }
    const vout = tx.vout[index];
    if (!vout) {
      return void 0;
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
    onlyNonRgbppUtxos?: boolean;
    onlyConfirmedUtxos?: boolean;
    excludeUtxos?: {
      txid: string;
      vout: number;
    }[];
  }): Promise<{
    utxos: Utxo[];
    satoshi: number;
    exceedSatoshi: number;
  }> {
    const { address, targetAmount, minUtxoSatoshi, onlyConfirmedUtxos, onlyNonRgbppUtxos, excludeUtxos = [] } = props;
    const utxos = await this.getUtxos(address, {
      only_confirmed: onlyConfirmedUtxos,
      min_satoshi: minUtxoSatoshi,
    });

    const collected = [];
    let collectedAmount = 0;
    for (const utxo of utxos) {
      if (collectedAmount >= targetAmount) {
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
      if (onlyNonRgbppUtxos) {
        const ckbRgbppAssets = await this.service.getRgbppAssetsByBtcUtxo(utxo.txid, utxo.vout);
        if (ckbRgbppAssets && ckbRgbppAssets.length > 0) {
          continue;
        }
      }
      collected.push(utxo);
      collectedAmount += utxo.value;
    }

    if (collectedAmount < targetAmount) {
      throw TxBuildError.withComment(
        ErrorCodes.INSUFFICIENT_UTXO,
        `expected: ${targetAmount}, actual: ${collectedAmount}`,
      );
    }

    return {
      utxos: collected,
      satoshi: collectedAmount,
      exceedSatoshi: collectedAmount - targetAmount,
    };
  }

  // Get recommended fee rates from mempool.space.
  // From fastest to slowest: fastestFee > halfHourFee > economyFee > hourFee > minimumFee
  async getRecommendedFeeRates(): Promise<FeesRecommended> {
    try {
      return await this.mempool.bitcoin.fees.getFeesRecommended();
    } catch (err: any) {
      throw TxBuildError.withComment(ErrorCodes.MEMPOOL_API_RESPONSE_ERROR, err.message ?? JSON.stringify(err));
    }
  }

  // Get the recommended average fee rate.
  async getAverageFeeRate(): Promise<number> {
    const fees = await this.getRecommendedFeeRates();
    return fees.halfHourFee;
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
      }
      throw err;
    }
  }
}
