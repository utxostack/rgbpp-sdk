import { NetworkType } from '../network';
import { TxBuild } from '../transaction/build';
import { UniSatOpenApi } from '../query/uniSatOpenApi';

export async function sendBtc(props: {
  from: string;
  tos: {
    address: string;
    value: number;
  }[];
  openApi: UniSatOpenApi;
  networkType: NetworkType;
  changeAddress?: string;
  fee: number;
}) {
  const tx = new TxBuild({
    openApi: props.openApi,
    changeAddress: props.changeAddress ?? props.from,
    networkType: props.networkType,
    fee: props.fee,
  });

  props.tos.forEach((to) => {
    tx.addOutput(to.address, to.value);
  });

  await tx.collectInputs(props.from);
  return tx.toPsbt();
}
