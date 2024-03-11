import { bitcoin } from '../bitcoin';
import { NetworkType } from '../network';
import { DataSource } from '../query/source';
import { TxBuilder, TxTo } from '../transaction/build';
import { isSupportedFromAddress } from '../address';
import { ErrorCodes, TxBuildError } from '../error';

export async function sendBtc(props: {
  from: string;
  tos: TxTo[];
  source: DataSource;
  networkType: NetworkType;
  minUtxoSatoshi?: number;
  changeAddress?: string;
  fromPubkey?: string;
  feeRate?: number;
}): Promise<bitcoin.Psbt> {
  if (!isSupportedFromAddress(props.from)) {
    throw new TxBuildError(ErrorCodes.UNSUPPORTED_ADDRESS_TYPE);
  }

  const tx = new TxBuilder({
    source: props.source,
    networkType: props.networkType,
    changeAddress: props.changeAddress ?? props.from,
    minUtxoSatoshi: props.minUtxoSatoshi,
    feeRate: props.feeRate,
  });

  props.tos.forEach((to) => {
    tx.addTo(to);
  });

  await tx.collectInputsAndPayFee({
    address: props.from,
    pubkey: props.fromPubkey,
  });

  return tx.toPsbt();
}
