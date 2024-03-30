import clone from 'lodash/cloneDeep';
import { bitcoin } from '../bitcoin';
import { addressToScriptPublicKeyHex, AddressType, getAddressType, isSupportedFromAddress } from '../address';
import { DataSource } from '../query/source';
import { NetworkType, RgbppBtcConfig } from '../preset/types';
import { ErrorCodes, ErrorMessages, TxBuildError } from '../error';
import { networkTypeToConfig } from '../preset/config';
import { dataToOpReturnScriptPubkey, isOpReturnScriptPubkey } from './embed';
import { Utxo, utxoToInput } from './utxo';
import { FeeEstimator } from './fee';

export interface TxInput {
  data: {
    hash: string;
    index: number;
    witnessUtxo: { value: number; script: Buffer };
    tapInternalKey?: Buffer;
  };
  utxo: Utxo;
}

export type TxOutput = TxAddressOutput | TxScriptOutput;
export interface BaseOutput {
  value: number;
  fixed?: boolean;
  protected?: boolean;
  minUtxoSatoshi?: number;
}
export interface TxAddressOutput extends BaseOutput {
  address: string;
}
export interface TxScriptOutput extends BaseOutput {
  script: Buffer;
}

export type InitOutput = TxAddressOutput | TxDataOutput | TxScriptOutput;
export interface TxDataOutput extends BaseOutput {
  data: Buffer | string;
}

export class TxBuilder {
  inputs: TxInput[] = [];
  outputs: TxOutput[] = [];

  source: DataSource;
  config: RgbppBtcConfig;
  networkType: NetworkType;
  minUtxoSatoshi: number;
  feeRate?: number;

  constructor(props: { source: DataSource; minUtxoSatoshi?: number; feeRate?: number }) {
    this.source = props.source;
    this.networkType = this.source.networkType;
    this.config = networkTypeToConfig(this.networkType);
    this.minUtxoSatoshi = props.minUtxoSatoshi ?? this.config.btcUtxoDustLimit;
    this.feeRate = props.feeRate;
  }

  hasInput(hash: string, index: number): boolean {
    return this.inputs.some((input) => input.data.hash === hash && input.data.index === index);
  }

  addInput(utxo: Utxo) {
    if (this.hasInput(utxo.txid, utxo.vout)) {
      throw new TxBuildError(
        ErrorCodes.DUPLICATED_UTXO,
        `${ErrorMessages[ErrorCodes.DUPLICATED_UTXO]}: hash: ${utxo.txid}, index: ${utxo.vout}`,
      );
    }

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

    const minUtxoSatoshi = result.minUtxoSatoshi ?? this.minUtxoSatoshi;
    const isOpReturnOutput = 'script' in result && isOpReturnScriptPubkey(result.script);
    if (!isOpReturnOutput && result.value < minUtxoSatoshi) {
      throw new TxBuildError(
        ErrorCodes.DUST_OUTPUT,
        `${ErrorMessages[ErrorCodes.DUST_OUTPUT]}: expected ${minUtxoSatoshi}, but defined ${result.value}`,
      );
    }

    this.outputs.push(result);
  }

  addOutputs(outputs: InitOutput[]) {
    outputs.forEach((output) => {
      this.addOutput(output);
    });
  }

  async payFee(props: {
    address: string;
    publicKey?: string;
    changeAddress?: string;
    deductFromOutputs?: boolean;
    feeRate?: number;
  }) {
    const { address, publicKey, feeRate, changeAddress, deductFromOutputs } = props;
    const originalInputs = clone(this.inputs);
    const originalOutputs = clone(this.outputs);

    // Use the average fee rate if feeRate is not provided
    // The transaction is expected be confirmed within half an hour with the fee rate
    let averageFeeRate: number | undefined;
    if (!feeRate && !this.feeRate) {
      averageFeeRate = await this.source.getAverageFeeRate();
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
      const currentFeeRate = feeRate ?? averageFeeRate;
      const fee = await this.calculateFee(addressType, currentFeeRate);
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

  async calculateFee(addressType: AddressType, feeRate?: number): Promise<number> {
    if (!feeRate && !this.feeRate) {
      throw new TxBuildError(ErrorCodes.INVALID_FEE_RATE, `${ErrorMessages[ErrorCodes.INVALID_FEE_RATE]}: ${feeRate}`);
    }

    const currentFeeRate = feeRate ?? this.feeRate!;

    const psbt = await this.createEstimatedPsbt(addressType);
    const tx = psbt.extractTransaction(true);

    const inputs = tx.ins.length;
    const weightWithWitness = tx.byteLength(true);
    const weightWithoutWitness = tx.byteLength(false);

    const weight = weightWithoutWitness * 3 + weightWithWitness + inputs;
    const virtualSize = Math.ceil(weight / 4);
    return Math.ceil(virtualSize * currentFeeRate);
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
    const network = this.config.network;
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
