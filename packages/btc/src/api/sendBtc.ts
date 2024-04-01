import { bitcoin } from '../bitcoin';
import { DataSource } from '../query/source';
import { InitOutput, TxBuilder } from '../transaction/build';

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
  const tx = new TxBuilder({
    source: props.source,
    feeRate: props.feeRate,
    minUtxoSatoshi: props.minUtxoSatoshi,
    onlyConfirmedUtxos: props.onlyConfirmedUtxos,
  });

  props.tos.forEach((to) => {
    tx.addOutput({
      fixed: true,
      ...to,
    });
  });

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

export async function sendBtc(props: SendBtcProps): Promise<bitcoin.Psbt> {
  const { builder } = await createSendBtcBuilder(props);
  return builder.toPsbt();
}
