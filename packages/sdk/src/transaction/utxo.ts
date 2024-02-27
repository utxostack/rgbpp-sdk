import { MIN_COLLECTABLE_SATOSHIS } from '../constants';
import { ErrorCodes, TxBuildError } from '../error';
import { UnspentOutput } from '../types';
import { UtxoSource } from './source';

export async function collectSatoshis(
  source: UtxoSource,
  address: string,
  targetAmount: number,
): Promise<{
  utxos: UnspentOutput[];
  satoshi: number;
}> {
  const utxos = await source.getUtxos(address);

  const collected = [];
  let collectedAmount = 0;
  for (const utxo of utxos) {
    if (utxo.value < MIN_COLLECTABLE_SATOSHIS) {
      continue;
    }
    if (collectedAmount >= targetAmount) {
      break;
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
  };
}
