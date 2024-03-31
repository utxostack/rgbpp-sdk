import { ErrorCodes, TxBuildError } from '../error';
import { AddressType } from '../address';
import { TxInput } from './build';
import { remove0x, toXOnly } from '../utils';

export interface Output {
  txid: string;
  vout: number;
  value: number;
  scriptPk: string;
}

export interface Utxo extends Output {
  addressType: AddressType;
  address: string;
  pubkey?: string;
}

export function utxoToInput(utxo: Utxo): TxInput {
  if (utxo.addressType === AddressType.P2WPKH) {
    const data = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: utxo.value,
        script: Buffer.from(remove0x(utxo.scriptPk), 'hex'),
      },
    };

    return {
      data,
      utxo,
    };
  }
  if (utxo.addressType === AddressType.P2TR) {
    if (!utxo.pubkey) {
      throw new TxBuildError(ErrorCodes.MISSING_PUBKEY);
    }
    const data = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: utxo.value,
        script: Buffer.from(remove0x(utxo.scriptPk), 'hex'),
      },
      tapInternalKey: toXOnly(Buffer.from(remove0x(utxo.pubkey), 'hex')),
    };
    return {
      data,
      utxo,
    };
  }

  throw new TxBuildError(ErrorCodes.UNSUPPORTED_ADDRESS_TYPE);
}
