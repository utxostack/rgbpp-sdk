import { bitcoin } from '../bitcoin';
import { Utxo } from '../transaction/utxo';
import { DataSource } from '../query/source';
import { TxBuilder, InitOutput } from '../transaction/build';

export interface SendUtxosProps {
  inputs: Utxo[];
  outputs: InitOutput[];
  source: DataSource;
  from: string;
  feeRate?: number;
  fromPubkey?: string;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  onlyConfirmedUtxos?: boolean;
}

export async function createSendUtxosBuilder(props: SendUtxosProps): Promise<{
  builder: TxBuilder;
  feeRate: number;
  fee: number;
}> {
  const tx = new TxBuilder({
    source: props.source,
    feeRate: props.feeRate,
    minUtxoSatoshi: props.minUtxoSatoshi,
    onlyConfirmedUtxos: props.onlyConfirmedUtxos,
  });

  tx.addInputs(props.inputs);
  tx.addOutputs(props.outputs);

  if (props.onlyConfirmedUtxos) {
    await tx.validateInputs();
  }

  const paid = await tx.payFee({
    address: props.from,
    publicKey: props.fromPubkey,
    changeAddress: props.changeAddress,
  });

  return {
    builder: tx,
    fee: paid.fee,
    feeRate: paid.feeRate,
  };
}

export async function sendUtxos(props: SendUtxosProps): Promise<bitcoin.Psbt> {
  const { builder } = await createSendUtxosBuilder(props);
  return builder.toPsbt();
}
