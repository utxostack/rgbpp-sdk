import { bitcoin } from '../bitcoin';
import { DataSource } from '../query/source';
import { InitOutput, TxBuilder } from '../transaction/build';
import { createSendUtxosBuilder } from './sendUtxos';

export interface SendBtcProps {
  from: string;
  tos: InitOutput[];
  source: DataSource;
  feeRate?: number;
  fromPubkey?: string;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  onlyConfirmedUtxos?: boolean;
}

export async function createSendBtcBuilder(props: SendBtcProps): Promise<{
  builder: TxBuilder;
  feeRate: number;
  fee: number;
}> {
  // By default, all outputs in the sendBtc() API are fixed
  const outputs = props.tos.map((to) => ({
    fixed: true,
    ...to,
  }));

  return await createSendUtxosBuilder({
    inputs: [],
    outputs: outputs,
    from: props.from,
    source: props.source,
    feeRate: props.feeRate,
    fromPubkey: props.fromPubkey,
    changeAddress: props.changeAddress,
    minUtxoSatoshi: props.minUtxoSatoshi,
    onlyConfirmedUtxos: props.onlyConfirmedUtxos,
  });
}

export async function sendBtc(props: SendBtcProps): Promise<bitcoin.Psbt> {
  const { builder } = await createSendBtcBuilder(props);
  return builder.toPsbt();
}
