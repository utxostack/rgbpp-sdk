import clone from 'lodash/clone';
import { bitcoin } from '../bitcoin';
import { DataSource } from '../query/source';
import { ErrorCodes, TxBuildError } from '../error';
import { AddressType, UnspentOutput } from '../types';
import { NetworkType, toPsbtNetwork } from '../network';
import { MIN_COLLECTABLE_SATOSHI } from '../constants';
import { addressToScriptPublicKeyHex, getAddressType } from '../address';
import { removeHexPrefix } from '../utils';
import { dataToOpReturnScriptPubkey } from './embed';
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

export type TxOutput = TxAddressOutput | TxScriptOutput;
export interface TxAddressOutput {
  address: string;
  value: number;
}
export interface TxScriptOutput {
  script: Buffer;
  value: number;
}

export type TxTo = TxAddressOutput | TxDataOutput;
export interface TxDataOutput {
  data: Buffer | string;
  value: number;
}

export class TxBuilder {
  inputs: TxInput[] = [];
  outputs: TxOutput[] = [];

  source: DataSource;
  networkType: NetworkType;
  changedAddress: string;
  minUtxoSatoshi: number;
  feeRate: number;

  constructor(props: {
    source: DataSource;
    networkType: NetworkType;
    changeAddress: string;
    minUtxoSatoshi?: number;
    feeRate?: number;
  }) {
    this.source = props.source;

    this.feeRate = props.feeRate ?? 1;
    this.networkType = props.networkType;
    this.changedAddress = props.changeAddress;
    this.minUtxoSatoshi = props.minUtxoSatoshi ?? MIN_COLLECTABLE_SATOSHI;
  }

  addInput(utxo: UnspentOutput) {
    utxo = clone(utxo);
    this.inputs.push(utxoToInput(utxo));
  }

  addOutput(output: TxOutput) {
    output = clone(output);
    this.outputs.push(output);
  }

  addTo(to: TxTo) {
    if ('data' in to) {
      const data = typeof to.data === 'string' ? Buffer.from(removeHexPrefix(to.data), 'hex') : to.data;
      const scriptPubkey = dataToOpReturnScriptPubkey(data);

      return this.addOutput({
        script: scriptPubkey,
        value: to.value,
      });
    }
    if ('address' in to) {
      return this.addOutput(to);
    }

    throw new TxBuildError(ErrorCodes.UNSUPPORTED_OUTPUT);
  }

  async collectInputsAndPayFee(address: string, fee?: number, extraChange?: number): Promise<void> {
    extraChange = extraChange ?? 0;
    fee = fee ?? 0;

    const outputAmount = this.outputs.reduce((acc, out) => acc + out.value, 0);
    const targetAmount = outputAmount + fee + extraChange;

    const { utxos, satoshi, exceedSatoshi } = await this.source.collectSatoshi(
      address,
      targetAmount,
      this.minUtxoSatoshi,
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
      this.addOutput({
        address: this.changedAddress,
        value: changeSatoshi,
      });
    }

    const addressType = getAddressType(address);
    const estimatedFee = await this.calculateFee(addressType);
    console.log(`expected fee: ${estimatedFee}`);
    if (estimatedFee > fee || changeSatoshi < this.minUtxoSatoshi) {
      this.inputs = originalInputs;
      this.outputs = originalOutputs;

      const nextExtraChange = (() => {
        if (requireChangeUtxo) {
          if (changeSatoshi < this.minUtxoSatoshi) {
            return this.minUtxoSatoshi;
          }
          return extraChange;
        }
        return 0;
      })();

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
