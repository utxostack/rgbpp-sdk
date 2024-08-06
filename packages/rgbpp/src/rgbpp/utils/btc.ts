import { BaseOutput, remove0x } from '@rgbpp-sdk/btc';
import { RgbppError, RgbppErrorCodes } from '../error';

export function encodeUtxoId(txid: string, vout: number): string {
  return `${remove0x(txid)}:${vout}`;
}

export function decodeUtxoId(utxoId: string): BaseOutput {
  const [txid, vout] = utxoId.split(':');
  if (!txid || txid.length !== 64 || !vout || isNaN(parseInt(vout))) {
    throw RgbppError.withComment(RgbppErrorCodes.CANNOT_DECODE_UTXO_ID, utxoId);
  }

  return {
    txid,
    vout: parseInt(vout),
  };
}
