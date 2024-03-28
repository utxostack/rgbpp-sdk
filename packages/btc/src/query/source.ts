import { FeesRecommended } from '@mempool/mempool.js/lib/interfaces/bitcoin/fees';
import { BtcAssetsApi, BtcApiUtxoParams } from '@rgbpp-sdk/service';
import { Utxo } from '../transaction/utxo';
import { NetworkType } from '../preset/types';
import { ErrorCodes, ErrorMessages, TxBuildError } from '../error';
import { addressToScriptPublicKeyHex, getAddressType } from '../address';
import { createMempool, MempoolInstance } from './mempool';
import { remove0x } from '../utils';

export class DataSource {
  public service: BtcAssetsApi;
  public networkType: NetworkType;
  public mempool: MempoolInstance;

  constructor(service: BtcAssetsApi, networkType: NetworkType) {
    this.service = service;
    this.networkType = networkType;
    this.mempool = createMempool(networkType);
  }

  async getUtxo(hash: string, index: number): Promise<Utxo | undefined> {
    hash = remove0x(hash);

    const tx = await this.service.getBtcTransaction(hash);
    if (!tx) {
      return void 0;
    }
    const vout = tx.vout[index];
    if (!vout) {
      return void 0;
    }

    return {
      txid: hash,
      vout: index,
      value: vout.value,
      scriptPk: vout.scriptpubkey,
      address: vout.scriptpubkey_address,
      addressType: getAddressType(vout.scriptpubkey_address),
    };
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
    excludeUtxos?: {
      txid: string;
      vout: number;
    }[];
  }): Promise<{
    utxos: Utxo[];
    satoshi: number;
    exceedSatoshi: number;
  }> {
    const { address, targetAmount, minUtxoSatoshi, excludeUtxos = [] } = props;
    const utxos = await this.getUtxos(address, {
      min_satoshi: minUtxoSatoshi,
    });

    const collected = [];
    let collectedAmount = 0;
    for (const utxo of utxos) {
      if (collectedAmount >= targetAmount) {
        break;
      }
      if (minUtxoSatoshi !== void 0 && utxo.value < minUtxoSatoshi) {
        continue;
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

    if (collectedAmount < targetAmount) {
      throw new TxBuildError(ErrorCodes.INSUFFICIENT_UTXO);
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
      throw new TxBuildError(
        ErrorCodes.MEMPOOL_API_RESPONSE_ERROR,
        `${ErrorMessages[ErrorCodes.MEMPOOL_API_RESPONSE_ERROR]}: ${err.message ?? JSON.stringify(err)}`,
      );
    }
  }

  // Get the recommended average fee rate.
  async getAverageFeeRate(): Promise<number> {
    const fees = await this.getRecommendedFeeRates();
    return fees.halfHourFee;
  }
}
