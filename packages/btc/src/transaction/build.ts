import clone from 'lodash/cloneDeep';
import { bitcoin } from '../bitcoin';
import { DataSource } from '../query/source';
import { Utxo } from '../types';
import { AddressType } from '../address';
import { ErrorCodes, ErrorMessages, TxBuildError } from '../error';
import { NetworkType, toPsbtNetwork } from '../network';
import { addressToScriptPublicKeyHex, getAddressType, isSupportedFromAddress } from '../address';
import { dataToOpReturnScriptPubkey } from './embed';
import { BTC_UTXO_DUST_LIMIT, FEE_RATE } from '../constants';
import { remove0x, toXOnly } from '../utils';
import { FeeEstimator } from './fee';

interface TxInput {
  data: {
    hash: string;
    index: number;
    witnessUtxo: { value: number; script: Buffer };
    tapInternalKey?: Buffer;
  };
  utxo: Utxo;
}

export type TxOutput = TxAddressOutput | TxScriptOutput;
export type InitOutput = TxAddressOutput | TxDataOutput | TxScriptOutput;

export interface BaseOutput {
  value: number;
  fixed?: boolean;
  protected?: boolean;
  minUtxoSatoshi?: number;
}
export interface TxAddressOutput extends BaseOutput {
  address: string;
}
export interface TxDataOutput extends BaseOutput {
  data: Buffer | string;
}
export interface TxScriptOutput extends BaseOutput {
  script: Buffer;
}

export class TxBuilder {
  inputs: TxInput[] = [];
  outputs: TxOutput[] = [];

  source: DataSource;
  networkType: NetworkType;
  minUtxoSatoshi: number;
  feeRate?: number;
  defaultFeeRate?: number;

  constructor(props: { source: DataSource; minUtxoSatoshi?: number; feeRate?: number }) {
    this.source = props.source;
    this.networkType = this.source.networkType;

    this.feeRate = props.feeRate;
    this.minUtxoSatoshi = props.minUtxoSatoshi ?? BTC_UTXO_DUST_LIMIT;
  }

  addInput(utxo: Utxo) {
    utxo = clone(utxo);
    this.inputs.push(utxoToInput(utxo));
  }

  addInputs(utxos: Utxo[]) {
    utxos.forEach((utxo) => {
      this.addInput(utxo);
    });
  }

  addOutput(output: InitOutput) {
    let result: TxOutput | undefined;

    if ('data' in output) {
      result = {
        script: dataToOpReturnScriptPubkey(output.data),
        value: output.value,
        fixed: output.fixed,
        protected: output.protected,
        minUtxoSatoshi: output.minUtxoSatoshi,
      };
    }
    if ('address' in output || 'script' in output) {
      result = clone(output);
    }
    if (!result) {
      throw new TxBuildError(ErrorCodes.UNSUPPORTED_OUTPUT);
    }

    this.outputs.push(result);
  }

  addOutputs(outputs: InitOutput[]) {
    outputs.forEach((output) => {
      this.addOutput(output);
    });
  }

  async payFee(props: { address: string; publicKey?: string; changeAddress?: string; deductFromOutputs?: boolean }) {
    const { address, publicKey, changeAddress, deductFromOutputs } = props;
    const originalInputs = clone(this.inputs);
    const originalOutputs = clone(this.outputs);

    // Get default fee rate from mempool.space if feeRate is not provided
    // The tx is expected be confirmed within half an hour
    if (!this.feeRate) {
      this.defaultFeeRate = await this.source.getAverageFeeRate();
    }

    let previousFee: number = 0;
    while (true) {
      const { inputsNeeding, outputsNeeding } = this.summary();
      if (outputsNeeding > 0) {
        // If sum(inputs) > sum(outputs), return change while deducting fee
        // Note, should not deduct fee from outputs while also returning change at the same time
        const returnAmount = outputsNeeding - previousFee;
        await this.injectChange({
          address: changeAddress ?? address,
          amount: returnAmount,
          publicKey,
        });
      } else {
        const targetAmount = inputsNeeding + previousFee;
        await this.injectSatoshi({
          address,
          publicKey,
          targetAmount,
          changeAddress,
          deductFromOutputs,
        });
      }

      const addressType = getAddressType(address);
      const fee = await this.calculateFee(addressType);
      if ([-1, 0, 1].includes(fee - previousFee)) {
        break;
      }

      previousFee = fee;
      this.inputs = clone(originalInputs);
      this.outputs = clone(originalOutputs);
    }
  }

  async injectSatoshi(props: {
    address: string;
    publicKey?: string;
    targetAmount: number;
    changeAddress?: string;
    injectCollected?: boolean;
    deductFromOutputs?: boolean;
  }) {
    if (!isSupportedFromAddress(props.address)) {
      throw new TxBuildError(ErrorCodes.UNSUPPORTED_ADDRESS_TYPE);
    }

    const injectCollected = props.injectCollected ?? false;
    const deductFromOutputs = props.deductFromOutputs ?? true;

    let collected = 0;
    let changeAmount = 0;
    let targetAmount = props.targetAmount;

    const _collect = async (_targetAmount: number, stack?: boolean) => {
      if (stack) {
        targetAmount += _targetAmount;
      }

      const { utxos, satoshi } = await this.source.collectSatoshi({
        address: props.address,
        targetAmount: _targetAmount,
        minUtxoSatoshi: this.minUtxoSatoshi,
        excludeUtxos: this.inputs.map((row) => row.utxo),
      });
      utxos.forEach((utxo) => {
        this.addInput({
          ...utxo,
          pubkey: props.publicKey,
        });
      });

      collected += satoshi;
      _updateChangeAmount();
    };
    const _updateChangeAmount = () => {
      if (injectCollected) {
        changeAmount = collected + targetAmount;
      } else {
        changeAmount = collected - targetAmount;
      }
    };

    // Collect from outputs
    if (deductFromOutputs) {
      for (let i = 0; i < this.outputs.length; i++) {
        const output = this.outputs[i];
        if (output.fixed) {
          continue;
        }
        if (collected >= targetAmount) {
          break;
        }

        // If output.protected is true, do not destroy the output
        // Only collect the satoshi from (output.value - minUtxoSatoshi)
        const minUtxoSatoshi = output.minUtxoSatoshi ?? this.minUtxoSatoshi;
        const freeAmount = output.value - minUtxoSatoshi;
        const remain = targetAmount - collected;
        if (output.protected) {
          // freeAmount=100, remain=50, collectAmount=50
          // freeAmount=100, remain=150, collectAmount=100
          const collectAmount = Math.min(freeAmount, remain);
          output.value -= collectAmount;
          collected += collectAmount;
        } else {
          // output.value=200, freeAmount=100, remain=50, collectAmount=50
          // output.value=200, freeAmount=100, remain=150, collectAmount=100
          // output.value=100, freeAmount=0, remain=150, collectAmount=100
          const collectAmount = output.value > remain ? Math.min(freeAmount, remain) : output.value;
          output.value -= collectAmount;
          collected += collectAmount;

          if (output.value === 0) {
            this.outputs.splice(i, 1);
            i--;
          }
        }
      }
    }

    // Collect target amount of satoshi from DataSource
    if (collected < targetAmount) {
      await _collect(targetAmount - collected);
    }

    // If 0 < change amount < minUtxoSatoshi, collect one more time
    if (changeAmount > 0 && changeAmount < this.minUtxoSatoshi) {
      await _collect(this.minUtxoSatoshi - changeAmount);
    }

    // If not collected enough satoshi, revert to the original state and throw error
    const insufficientBalance = collected < targetAmount;
    const insufficientForChange = changeAmount > 0 && changeAmount < this.minUtxoSatoshi;
    if (insufficientBalance || insufficientForChange) {
      throw new TxBuildError(ErrorCodes.INSUFFICIENT_UTXO);
    }

    // Return change
    let changeIndex: number = -1;
    if (changeAmount > 0) {
      changeIndex = this.outputs.length;
      this.addOutput({
        address: props.changeAddress ?? props.address,
        value: changeAmount,
      });
    }

    return {
      collected,
      changeIndex,
      changeAmount,
    };
  }

  async injectChange(props: { amount: number; address: string; publicKey?: string }) {
    const { address, publicKey, amount } = props;

    for (let i = 0; i < this.outputs.length; i++) {
      const output = this.outputs[i];
      if (output.fixed) {
        continue;
      }
      if (!('address' in output) || output.address !== address) {
        continue;
      }

      output.value += amount;
      return;
    }

    if (amount < this.minUtxoSatoshi) {
      const { collected } = await this.injectSatoshi({
        address,
        publicKey,
        targetAmount: amount,
        injectCollected: true,
        deductFromOutputs: false,
      });
      if (collected < amount) {
        throw new TxBuildError(ErrorCodes.INSUFFICIENT_UTXO);
      }
    } else {
      this.addOutput({
        address: address,
        value: amount,
      });
    }
  }

  async calculateFee(addressType: AddressType): Promise<number> {
    const feeRate = this.feeRate ?? this.defaultFeeRate;
    if (!feeRate) {
      throw new TxBuildError(ErrorCodes.INVALID_FEE_RATE, `${ErrorMessages[ErrorCodes.INVALID_FEE_RATE]}: ${feeRate}`);
    }

    const psbt = await this.createEstimatedPsbt(addressType);
    const tx = psbt.extractTransaction(true);

    const inputs = tx.ins.length;
    const weightWithWitness = tx.byteLength(true);
    const weightWithoutWitness = tx.byteLength(false);

    const weight = weightWithoutWitness * 3 + weightWithWitness + inputs;
    const virtualSize = Math.ceil(weight / 4);
    return Math.ceil(virtualSize * feeRate);
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

  summary() {
    const sumOfInputs = this.inputs.reduce((acc, input) => acc + input.utxo.value, 0);
    const sumOfOutputs = this.outputs.reduce((acc, output) => acc + output.value, 0);

    return {
      inputsTotal: sumOfInputs,
      inputsRemaining: sumOfInputs - sumOfOutputs,
      inputsNeeding: sumOfOutputs > sumOfInputs ? sumOfOutputs - sumOfInputs : 0,
      outputsTotal: sumOfOutputs,
      outputsRemaining: sumOfOutputs - sumOfInputs,
      outputsNeeding: sumOfInputs > sumOfOutputs ? sumOfInputs - sumOfOutputs : 0,
    };
  }

  clone(): TxBuilder {
    const tx = new TxBuilder({
      source: this.source,
      feeRate: this.feeRate,
      minUtxoSatoshi: this.minUtxoSatoshi,
    });

    tx.inputs = clone(this.inputs);
    tx.outputs = clone(this.outputs);

    return tx;
  }

  toPsbt(): bitcoin.Psbt {
    const network = toPsbtNetwork(this.networkType);
    const psbt = new bitcoin.Psbt({ network });
    this.inputs.forEach((input) => {
      psbt.data.addInput(input.data);
    });
    this.outputs.forEach((output) => {
      psbt.addOutput(output);
    });
    return psbt;
  }
}

export function utxoToInput(utxo: Utxo): TxInput {
  if (utxo.addressType === AddressType.P2WPKH) {
    const data = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: utxo.value,
        script: Buffer.from(remove0x(utxo.scriptPk), 'hex'),
      },
    };

    return {
      data,
      utxo,
    };
  }
  if (utxo.addressType === AddressType.P2TR) {
    if (!utxo.pubkey) {
      throw new TxBuildError(ErrorCodes.MISSING_PUBKEY);
    }
    const data = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: utxo.value,
        script: Buffer.from(remove0x(utxo.scriptPk), 'hex'),
      },
      tapInternalKey: toXOnly(Buffer.from(remove0x(utxo.pubkey), 'hex')),
    };
    return {
      data,
      utxo,
    };
  }

  throw new TxBuildError(ErrorCodes.UNSUPPORTED_ADDRESS_TYPE);
}
