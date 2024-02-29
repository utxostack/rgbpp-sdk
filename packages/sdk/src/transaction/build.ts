import clone from 'lodash/clone';
import bitcoin from 'bitcoinjs-lib';
import { DataSource } from '../query/source';
import { ErrorCodes, TxBuildError } from '../error';
import { AddressType, UnspentOutput } from '../types';
import { NetworkType, toPsbtNetwork } from '../network';
import { addressToScriptPublicKeyHex, getAddressType } from '../address';
import { MIN_COLLECTABLE_SATOSHI } from '../constants';
import { FeeEstimator } from './fee';

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

export class TxBuilder {
  inputs: TxInput[] = [];
  outputs: TxOutput[] = [];

  source: DataSource;
  networkType: NetworkType;
  changedAddress: string;
  minimalSatoshi: number;
  feeRate: number;

  constructor(props: {
    source: DataSource;
    networkType: NetworkType;
    changeAddress: string;
    minimalUtxoSatoshi?: number;
    feeRate?: number;
  }) {
    this.source = props.source;

    this.feeRate = props.feeRate ?? 1;
    this.networkType = props.networkType;
    this.changedAddress = props.changeAddress;
    this.minimalSatoshi = props.minimalUtxoSatoshi ?? MIN_COLLECTABLE_SATOSHI;
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

  async collectInputsAndPayFee(address: string, fee?: number, extraChange?: number): Promise<void> {
    extraChange = extraChange ?? 0;
    fee = fee ?? 0;

    const outputAmount = this.outputs.reduce((acc, out) => acc + out.value, 0);
    const targetAmount = outputAmount + fee + extraChange;

    const { utxos, satoshi, exceedSatoshi } = await this.source.collectSatoshi(
      address,
      targetAmount,
      this.minimalSatoshi,
    );
    if (satoshi < targetAmount) {
      throw new TxBuildError(ErrorCodes.INSUFFICIENT_UTXO);
    }

    const originalInputs = clone(this.inputs);
    utxos.forEach((utxo) => {
      this.addInput(utxo);
    });

    console.log('----');
    console.log(
      `collecting satoshi: ${targetAmount} = outputAmount(${outputAmount}) + fee(${fee}) + + extraChange(${extraChange})`,
    );

    const originalOutputs = clone(this.outputs);
    const changeSatoshi = exceedSatoshi + extraChange;
    const requireChangeUtxo = changeSatoshi > 0;
    console.log(
      `collected satoshi: ${satoshi}, collected utxos: [${this.inputs.map((u) => u.utxo.value)}], returning change: ${changeSatoshi}`,
    );
    if (requireChangeUtxo) {
      this.addOutput(this.changedAddress, changeSatoshi);
    }

    const addressType = getAddressType(address);
    const estimatedFee = await this.calculateFee(addressType);
    console.log(`expected fee: ${estimatedFee}`);
    if (estimatedFee > fee || changeSatoshi < this.minimalSatoshi) {
      this.inputs = originalInputs;
      this.outputs = originalOutputs;

      const nextExtraChange = requireChangeUtxo
        ? changeSatoshi < this.minimalSatoshi
          ? this.minimalSatoshi
          : extraChange
        : 0;

      console.log(`extra collecting satoshi: ${nextExtraChange}`);
      return await this.collectInputsAndPayFee(address, estimatedFee, nextExtraChange);
    }
  }

  async calculateFee(addressType: AddressType): Promise<number> {
    const psbt = await this.createEstimatedPsbt(addressType);
    const vSize = psbt.extractTransaction(true).virtualSize();
    console.log(
      `calculating vSize, vSize: ${vSize}, feeRate: ${this.feeRate}, rawFee: ${vSize * this.feeRate}, ceilFee: ${Math.ceil(vSize * this.feeRate)}`,
    );
    return Math.ceil(vSize * this.feeRate);
  }

  async createEstimatedPsbt(addressType: AddressType): Promise<bitcoin.Psbt> {
    const estimate = FeeEstimator.fromRandom(addressType, this.networkType);
    const estimateScriptPk = addressToScriptPublicKeyHex(estimate.address, this.networkType);

    const tx = this.clone();
    const utxos = tx.inputs.map((input) => input.utxo);
    tx.inputs = utxos.map((utxo) => {
      utxo.scriptPk = estimateScriptPk;
      utxo.pubkey = estimate.publicKey;
      return utxoToInput(utxo);
    });

    const psbt = tx.toPsbt();
    await estimate.signPsbt(psbt);
    return psbt;
  }

  clone(): TxBuilder {
    const tx = new TxBuilder({
      source: this.source,
      networkType: this.networkType,
      changeAddress: this.changedAddress,
      feeRate: this.feeRate,
    });
    tx.inputs = clone(this.inputs);
    tx.outputs = clone(this.outputs);
    return tx;
  }

  toPsbt(): bitcoin.Psbt {
    const network = toPsbtNetwork(this.networkType);
    const psbt = new bitcoin.Psbt({ network });
    this.inputs.forEach((input, index) => {
      psbt.data.addInput(input.data);
    });
    this.outputs.forEach((output) => {
      psbt.addOutput(output);
    });
    return psbt;
  }
}

export function utxoToInput(utxo: UnspentOutput): TxInput {
  if (utxo.addressType === AddressType.P2WPKH) {
    const data = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: utxo.value,
        script: Buffer.from(utxo.scriptPk, 'hex'),
      },
    };

    return {
      data,
      utxo,
    };
  }
  if (utxo.addressType === AddressType.P2TR) {
    const data = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: utxo.value,
        script: Buffer.from(utxo.scriptPk, 'hex'),
      },
      // TODO: how to obtain pubkey from the utxo directly?
      // tapInternalKey: toXOnly(Buffer.from(utxo.pubkey, "hex")),
    };
    return {
      data,
      utxo,
    };
  }

  throw new TxBuildError(ErrorCodes.UNSUPPORTED_ADDRESS_TYPE);
}
