import { bitcoin } from '../bitcoin';
import { Utxo } from '../transaction/utxo';
import { DataSource } from '../query/source';
import { TxBuilder, InitOutput } from '../transaction/build';

export async function sendUtxos(props: {
  inputs: Utxo[];
  outputs: InitOutput[];
  source: DataSource;
  from: string;
  fromPubkey?: string;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  feeRate?: number;
}): Promise<bitcoin.Psbt> {
  const tx = new TxBuilder({
    source: props.source,
    feeRate: props.feeRate,
    minUtxoSatoshi: props.minUtxoSatoshi,
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
