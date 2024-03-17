import { Utxo } from '../types';
import { NetworkType } from '../network';
import { ErrorCodes, TxBuildError } from '../error';
import { addressToScriptPublicKeyHex, getAddressType } from '../address';
import { BtcAssetsApi, BtcAssetsApiUtxoParams } from './service';

export class DataSource {
  public service: BtcAssetsApi;
  public networkType: NetworkType;

  constructor(service: BtcAssetsApi, networkType: NetworkType) {
    this.service = service;
    this.networkType = networkType;
  }

  async getUtxos(address: string, params?: BtcAssetsApiUtxoParams): Promise<Utxo[]> {
    const utxos = await this.service.getUtxos(address, params);

    const scriptPk = addressToScriptPublicKeyHex(address, this.networkType);
    return utxos
      .sort((a, b) => {
        const aOrder = `${a.status.block_height}${a.vout}`;
        const bOrder = `${b.status.block_height}${b.vout}`;
        return Number(aOrder) - Number(bOrder);
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
}
