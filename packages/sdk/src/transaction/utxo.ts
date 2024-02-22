import bitcoin from 'bitcoinjs-lib';
import { UniSatOpenApi } from '../query/uniSatOpenApi';
import { ErrorCodes, TxBuildError } from '../error';
import { AddressType, UnspentOutput } from '../types';
import { NetworkType, toPsbtNetwork } from '../network';
import { MIN_COLLECTABLE_SATOSHIS } from '../constants';

export async function collectSatoshis(openApi: UniSatOpenApi, address: string, satoshi: number, networkType: NetworkType): Promise<{
  utxos: UnspentOutput[];
  satoshi: number;
}> {
  const res = await openApi.getUtxos(address);
  const utxos = res.data.utxo;

  const collected = [];
  let collectedAmount = 0;
  for (const utxo of utxos) {
    if (utxo.satoshi < MIN_COLLECTABLE_SATOSHIS) {
      continue;
    }
    if (collectedAmount >= satoshi) {
      break;
    }
    collected.push(utxo);
    collectedAmount += utxo.satoshi;
  }

  if (collectedAmount < satoshi) {
    throw new TxBuildError(ErrorCodes.INSUFFICIENT_BTC_UTXO);
  }

  const convertedUtxos = collected.map((utxo) => {
    return {
      txid: utxo.txid,
      vout: utxo.vout,
      satoshi: utxo.satoshi,
      scriptPk: utxo.scriptPk,
      pubkey: bitcoin.address.fromOutputScript(
        bitcoin.address.toOutputScript(address, toPsbtNetwork(networkType)),
        toPsbtNetwork(networkType)
      ).toString(),
      // TODO: support other address types
      addressType: AddressType.P2WPKH,
    };
  });

  return {
    utxos: convertedUtxos,
    satoshi: collectedAmount,
  };
}
