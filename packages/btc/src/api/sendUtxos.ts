import { bitcoin } from '../bitcoin';
import { Utxo } from '../types';
import { NetworkType } from '../network';
import { DataSource } from '../query/source';
import { TxBuilder, InitOutput } from '../transaction/build';

export async function sendUtxos(props: {
  inputs: Utxo[];
  outputs: InitOutput[];
  source: DataSource;
  networkType: NetworkType;
  from: string;
  fromPubkey?: string;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  feeRate?: number;
}): Promise<bitcoin.Psbt> {
  const tx = new TxBuilder({
    source: props.source,
    networkType: props.networkType,
    minUtxoSatoshi: props.minUtxoSatoshi,
    feeRate: props.feeRate,
  });

  tx.addInputs(props.inputs);
  tx.addOutputs(props.outputs);

  await tx.payFee({
    address: props.from,
    publicKey: props.fromPubkey,
    changeAddress: props.changeAddress,
  });

  return tx.toPsbt();
}
