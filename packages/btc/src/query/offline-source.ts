import { BtcApiTransaction, BtcApiUtxoParams, BtcAssetsApi } from '@rgbpp-sdk/service';
import { BaseOutput, Output, Utxo } from '../transaction/utxo';
import { NetworkType } from '../preset/types';
import { ErrorCodes, TxBuildError } from '../error';
import { TxAddressOutput } from '../transaction/build';
import { isOpReturnScriptPubkey } from '../transaction/embed';
import { getAddressType } from '../address';
import { remove0x } from '../utils';
import { DataSource } from './source';

// * user-specific data
export interface OfflineBtcData {
  // Transactions whose ouputs safeguard the ownership of the RGB++ assets.
  // These transactions are used to construct the RGB++ UTXOs to be consumed.
  txs: BtcApiTransaction[];
  // Extra UTXOs for paying transaction fees.
  // Ensure these UTXOs are not used for locking RGB++ assets,
  // as doing so will result in the loss of the RGB++ assets.
  feeUtxos: Utxo[];
}

// * When using offline mode, the BTC fee rate must be provided,
// * as it is not possible to query the fee rate from third-party services.
// * However, `feeRate` is still optional at the API level to maintain compatibility.
export class OfflineDataSource extends DataSource {
  // txid -> tx
  private rgbppTxs: Record<string, BtcApiTransaction>;
  // address -> utxos
  private feeUtxos: Record<string, Utxo[]>;

  constructor(networkType: NetworkType, offlineData: OfflineBtcData) {
    super({} as BtcAssetsApi, networkType);
    this.rgbppTxs = offlineData.txs.reduce(
      (acc, tx) => {
        acc[tx.txid] = tx;
        return acc;
      },
      {} as Record<string, BtcApiTransaction>,
    );
    this.feeUtxos = offlineData.feeUtxos.reduce(
      (acc, utxo) => {
        acc[utxo.address] = [...(acc[utxo.address] ?? []), utxo];
        return acc;
      },
      {} as Record<string, Utxo[]>,
    );
  }

  async getOutput(hash: string, index: number, requireConfirmed?: boolean): Promise<Output | Utxo | undefined> {
    const txId = remove0x(hash);

    const tx = this.rgbppTxs[txId];
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
    return this.rgbppTxs[remove0x(hash)]?.status.confirmed ?? false;
  }

  async getUtxos(address: string, params?: BtcApiUtxoParams): Promise<Utxo[]> {
    const { min_satoshi } = params ?? {};
    if (min_satoshi) {
      return this.feeUtxos[address].filter((utxo) => utxo.value >= min_satoshi);
    }

    return this.feeUtxos[address] ?? [];
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

    const utxos = await this.getUtxos(props.address);

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
    return undefined;
  }
}
