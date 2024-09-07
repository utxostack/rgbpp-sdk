import { bitcoin } from '../bitcoin';
import { DataSource } from '../query/source';
import { TxBuilder, InitOutput } from '../transaction/build';
import { BaseOutput, Utxo, prepareUtxoInputs } from '../transaction/utxo';
import { AddressToPubkeyMap, addAddressToPubkeyMap } from '../address';
import { TxBuildError } from '../error';

export interface SendUtxosProps {
  inputs: Utxo[];
  outputs: InitOutput[];
  source: DataSource;
  from: string;
  feeRate?: number;
  fromPubkey?: string;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  noAssetsApiCache?: boolean;
  onlyConfirmedUtxos?: boolean;
  excludeUtxos?: BaseOutput[];

  // EXPERIMENTAL: the below props are unstable and can be altered at any time
  skipInputsValidation?: boolean;
  pubkeyMap?: AddressToPubkeyMap;
}

export async function createSendUtxosBuilder(props: SendUtxosProps): Promise<{
  builder: TxBuilder;
  fee: number;
  feeRate: number;
  changeIndex: number;
}> {
  const tx = new TxBuilder({
    source: props.source,
    feeRate: props.feeRate,
    minUtxoSatoshi: props.minUtxoSatoshi,
    onlyConfirmedUtxos: props.onlyConfirmedUtxos,
  });

  try {
    // Prepare the UTXO inputs:
    // 1. Fill pubkey for each P2TR UTXO, and throw if the corresponding pubkey is not found
    // 2. Throw if unconfirmed UTXOs are found (if onlyConfirmedUtxos == true && skipInputsValidation == false)
    const pubkeyMap = addAddressToPubkeyMap(props.pubkeyMap ?? {}, props.from, props.fromPubkey);
    const inputs = await prepareUtxoInputs({
      utxos: props.inputs,
      source: props.source,
      requireConfirmed: props.onlyConfirmedUtxos && !props.skipInputsValidation,
      requirePubkey: true,
      pubkeyMap,
    });

    tx.addInputs(inputs);
    tx.addOutputs(props.outputs);

    const paid = await tx.payFee({
      address: props.from,
      publicKey: pubkeyMap[props.from],
      changeAddress: props.changeAddress,
      excludeUtxos: props.excludeUtxos,
      noAssetsApiCache: props.noAssetsApiCache,
    });

    return {
      builder: tx,
      fee: paid.fee,
      feeRate: paid.feeRate,
      changeIndex: paid.changeIndex,
    };
  } catch (e) {
    // When caught TxBuildError, add TxBuilder as the context
    if (e instanceof TxBuildError) {
      e.setContext({ tx });
    }

    throw e;
  }
}

export async function sendUtxos(props: SendUtxosProps): Promise<bitcoin.Psbt> {
  const { builder } = await createSendUtxosBuilder(props);
  return builder.toPsbt();
}
