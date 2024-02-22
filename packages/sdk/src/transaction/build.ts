import bitcoin from 'bitcoinjs-lib';
import { AddressType, UnspentOutput } from '../types';
import { UniSatOpenApi } from '../query/uniSatOpenApi';
import { NetworkType, toPsbtNetwork } from '../network';
import { ErrorCodes, TxBuildError } from '../error';
import { collectSatoshis } from './utxo';

interface TxInput {
  data: {
    hash: string;
    index: number;
    witnessUtxo: { value: number; script: Buffer };
    tapInternalKey?: Buffer;
  };
  utxo: UnspentOutput;
}

interface TxOutput {
  address: string;
  value: number;
}

export class TxBuild {
  inputs: TxInput[] = [];
  outputs: TxOutput[] = [];

  networkType: NetworkType;
  changedAddress: string;
  fee: number;

  openApi: UniSatOpenApi;

  constructor(props: {
    openApi: UniSatOpenApi,
    networkType: NetworkType,
    changeAddress: string,
    fee: number,
  }) {
    this.openApi = props.openApi;

    this.networkType = props.networkType;
    this.changedAddress = props.changeAddress;
    this.fee = props.fee;
  }

  addInput(utxo: UnspentOutput) {
    this.inputs.push(utxoToInput(utxo));
  }

  addOutput(address: string, value: number) {
    this.outputs.push({
      address,
      value,
    });
  }

  async collectInputs(address: string) {
    const outputAmount = this.outputs.reduce((acc, output) => acc + output.value, 0);
    const neededAmount = outputAmount + this.fee;

    const { utxos, satoshi } = await collectSatoshis(this.openApi, address, neededAmount, this.networkType);
    utxos.forEach((utxo) => {
      this.addInput(utxo);
    });

    if (satoshi > neededAmount) {
      const change = satoshi - neededAmount;
      this.addOutput(this.changedAddress, change);
    }
  }

  toPsbt() {
    const network = toPsbtNetwork(this.networkType);
    const psbt = new bitcoin.Psbt({ network });
    this.inputs.forEach((v, index) => {
      psbt.data.addInput(v.data);
    });
    this.outputs.forEach((v) => {
      psbt.addOutput(v);
    });
    return psbt;
  }
}

export function utxoToInput(utxo: UnspentOutput): TxInput {
  // TODO: support other address types, currently only P2WPKH
  if (utxo.addressType === AddressType.P2WPKH) {
    const data = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: utxo.satoshi,
        script: Buffer.from(utxo.scriptPk, 'hex'),
      },
    };

    return {
      data,
      utxo,
    };
  }

  throw new TxBuildError(ErrorCodes.UNSUPPORTED_ADDRESS_TYPE);
}
