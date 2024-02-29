import bitcoin from 'bitcoinjs-lib';
import { NetworkType } from '../network';
import { DataSource } from '../query/source';
import { TxBuilder } from '../transaction/build';

export async function sendBtc(props: {
  from: string;
  tos: {
    address: string;
    value: number;
  }[];
  source: DataSource;
  networkType: NetworkType;
  changeAddress?: string;
  feeRate?: number;
}): Promise<bitcoin.Psbt> {
  const tx = new TxBuilder({
    source: props.source,
    networkType: props.networkType,
    changeAddress: props.changeAddress ?? props.from,
    feeRate: props.feeRate,
  });

  props.tos.forEach((to) => {
    tx.addOutput(to.address, to.value);
  });

  await tx.collectInputsAndPayFee(props.from);
  return tx.toPsbt();
}
