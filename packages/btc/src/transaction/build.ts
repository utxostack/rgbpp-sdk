import cloneDeep from 'lodash/cloneDeep.js';
import { bitcoin } from '../bitcoin';
import { DataSource } from '../query/source';
import { ErrorCodes, TxBuildError } from '../error';
import { NetworkType, RgbppBtcConfig } from '../preset/types';
import { isSupportedFromAddress } from '../address';
import { dataToOpReturnScriptPubkey, isOpReturnScriptPubkey } from './embed';
import { networkTypeToConfig } from '../preset/config';
import { BaseOutput, Utxo, utxoToInput } from './utxo';
import { limitPromiseBatchSize } from '../utils';
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
export interface TxBaseOutput {
  value: number;
  fixed?: boolean;
  protected?: boolean;
  minUtxoSatoshi?: number;
}
export interface TxAddressOutput extends TxBaseOutput {
  address: string;
}
export interface TxScriptOutput extends TxBaseOutput {
  script: Buffer;
}

export type InitOutput = TxAddressOutput | TxDataOutput | TxScriptOutput;
export interface TxDataOutput extends TxBaseOutput {
  data: Buffer | string;
}

export class TxBuilder {
  inputs: TxInput[] = [];
  outputs: TxOutput[] = [];

  source: DataSource;
  config: RgbppBtcConfig;
  networkType: NetworkType;
  onlyNonRgbppUtxos: boolean;
  onlyConfirmedUtxos: boolean;
  minUtxoSatoshi: number;
  feeRate?: number;

  constructor(props: {
    source: DataSource;
    onlyNonRgbppUtxos?: boolean;
    onlyConfirmedUtxos?: boolean;
    minUtxoSatoshi?: number;
    feeRate?: number;
  }) {
    this.source = props.source;
    this.networkType = this.source.networkType;
    this.config = networkTypeToConfig(this.networkType);
    this.onlyNonRgbppUtxos = props.onlyNonRgbppUtxos ?? true;
    this.onlyConfirmedUtxos = props.onlyConfirmedUtxos ?? false;
    this.minUtxoSatoshi = props.minUtxoSatoshi ?? this.config.btcUtxoDustLimit;
    this.feeRate = props.feeRate;
  }

  hasInput(hash: string, index: number): boolean {
    return this.inputs.some((input) => input.data.hash === hash && input.data.index === index);
  }

  addInput(utxo: Utxo) {
    if (this.hasInput(utxo.txid, utxo.vout)) {
      throw TxBuildError.withComment(ErrorCodes.DUPLICATED_UTXO, `hash: ${utxo.txid}, index: ${utxo.vout}`);
    }

    utxo = cloneDeep(utxo);
    this.inputs.push(utxoToInput(utxo));
  }

  addInputs(utxos: Utxo[]) {
    utxos.forEach((utxo) => {
      this.addInput(utxo);
    });
  }

  async validateInputs() {
    await Promise.all(
      this.inputs.map(async (input) => {
        return limitPromiseBatchSize(async () => {
          const transactionConfirmed = await this.source.isTransactionConfirmed(input.data.hash);
          if (!transactionConfirmed) {
            throw TxBuildError.withComment(
              ErrorCodes.UNCONFIRMED_UTXO,
              `hash: ${input.data.hash}, index: ${input.data.index}`,
            );
          }
        });
      }),
    );
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
      result = cloneDeep(output);
    }
    if (!result) {
      throw new TxBuildError(ErrorCodes.UNSUPPORTED_OUTPUT);
    }

    const minUtxoSatoshi = result.minUtxoSatoshi ?? this.minUtxoSatoshi;
    const isOpReturnOutput = 'script' in result && isOpReturnScriptPubkey(result.script);
    if (!isOpReturnOutput && result.value < minUtxoSatoshi) {
      throw TxBuildError.withComment(ErrorCodes.DUST_OUTPUT, `expected ${minUtxoSatoshi}, but defined ${result.value}`);
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
    excludeUtxos?: BaseOutput[];
    feeRate?: number;
  }): Promise<{
    fee: number;
    feeRate: number;
    changeIndex: number;
  }> {
    const { address, publicKey, feeRate, changeAddress, deductFromOutputs, excludeUtxos } = props;
    const originalInputs = cloneDeep(this.inputs);
    const originalOutputs = cloneDeep(this.outputs);

    // Create a cache key to enable the internal caching, prevent querying the Utxo[] too often
    // TODO: consider provide an option to disable the cache
    const internalCacheKey = `${Date.now()}`;

    // Fill a default recommended fee rate if props.feeRate is not provided
    let defaultFeeRate: number | undefined;
    if (!feeRate && !this.feeRate) {
      // * The original `DataSource` uses its `BtcAssetsApi` field to retrieve the BTC fee rate if it is not provided.
      // * This approach is not applicable in offline mode. We should establish a convention with developers that
      // * the fee rate must be provided in such cases, while still keeping `feeRate` optional at the API level.
      const feeRates = await this.source.service.getBtcRecommendedFeeRates();
      defaultFeeRate = feeRates.fastestFee;
    }

    // Use props.feeRate if it's specified
    const currentFeeRate = feeRate ?? this.feeRate ?? defaultFeeRate!;

    let currentFee = 0;
    let previousFee = 0;
    let isLoopedOnce = false;
    let isFeeExpected = false;
    let currentChangeIndex = -1;
    while (!isFeeExpected) {
      if (isLoopedOnce) {
        previousFee = currentFee;
        this.inputs = cloneDeep(originalInputs);
        this.outputs = cloneDeep(originalOutputs);
      }

      const { needCollect, needReturn, inputsTotal } = this.summary();
      const safeToProcess = inputsTotal > 0 || previousFee > 0;
      const returnAmount = needReturn - previousFee;
      if (safeToProcess && returnAmount > 0) {
        // If sum(inputs) - sum(outputs) > fee, return (change - fee) to a non-fixed output or to a new output.
        // Note when returning change to a new output, another satoshi collection may be needed.
        const { changeIndex } = await this.injectChange({
          address: changeAddress ?? address,
          amount: returnAmount,
          fromAddress: address,
          fromPublicKey: publicKey,
          internalCacheKey,
          excludeUtxos,
        });

        currentChangeIndex = changeIndex;
      } else {
        // If the inputs have insufficient satoshi, a satoshi collection is required.
        // For protection, at least collect 1 satoshi if the inputs are empty or the fee hasn't been calculated.
        const protectionAmount = safeToProcess ? 0 : 1;
        const targetAmount = needCollect - needReturn + previousFee + protectionAmount;
        const { changeIndex } = await this.injectSatoshi({
          address,
          publicKey,
          targetAmount,
          changeAddress,
          deductFromOutputs,
          internalCacheKey,
          excludeUtxos,
        });

        currentChangeIndex = changeIndex;
      }

      // Calculate network fee
      currentFee = await this.calculateFee(currentFeeRate);

      // If (fee = previousFee ±1), the fee is considered acceptable/expected.
      isFeeExpected = [-1, 0, 1].includes(currentFee - previousFee);
      if (!isLoopedOnce) {
        isLoopedOnce = true;
      }
    }

    // Clear cache for the Utxo[] list
    this.source.cache.cleanUtxos(internalCacheKey);

    return {
      fee: currentFee,
      feeRate: currentFeeRate,
      changeIndex: currentChangeIndex,
    };
  }

  async injectSatoshi(props: {
    address: string;
    publicKey?: string;
    targetAmount: number;
    changeAddress?: string;
    injectCollected?: boolean;
    deductFromOutputs?: boolean;
    internalCacheKey?: string;
    excludeUtxos?: BaseOutput[];
  }): Promise<{
    collected: number;
    changeIndex: number;
    changeAmount: number;
  }> {
    if (!isSupportedFromAddress(props.address)) {
      throw TxBuildError.withComment(ErrorCodes.UNSUPPORTED_ADDRESS_TYPE, props.address);
    }

    const targetAmount = props.targetAmount;
    const excludeUtxos = props.excludeUtxos ?? [];
    const injectCollected = props.injectCollected ?? false;
    const deductFromOutputs = props.deductFromOutputs ?? true;

    let collected = 0;
    let changeAmount = 0;

    /**
     * Collect from the "from" address via DataSource.
     * Will update the value of inputs/collected/changeAmount.
     *
     * The API has two layers of data caching:
     * - noAssetsApiCache: BtcAssetsApi cache, can be disabled if the set to true
     * - internalCacheKey: Internal cache, enabled if the key is provided
     */
    const _collect = async (_targetAmount: number) => {
      const { utxos, satoshi } = await this.source.collectSatoshi({
        address: props.address,
        targetAmount: _targetAmount,
        allowInsufficient: true,
        noAssetsApiCache: true,
        internalCacheKey: props.internalCacheKey,
        minUtxoSatoshi: this.minUtxoSatoshi,
        onlyNonRgbppUtxos: this.onlyNonRgbppUtxos,
        onlyConfirmedUtxos: this.onlyConfirmedUtxos,
        excludeUtxos: [...this.inputs.map((v) => v.utxo), ...excludeUtxos],
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
    /**
     * Update changeAmount depends on injectedCollected:
     * - true: If targetAmount=1000, collected=2000, changeAmount=2000+1000=3000
     * - false: If targetAmount=1000, collected=2000, changeAmount=2000-1000=1000
     */
    const _updateChangeAmount = () => {
      if (injectCollected) {
        changeAmount = collected + targetAmount;
      } else {
        changeAmount = collected - targetAmount;
      }
    };

    // 1. Collect from the non-fixed outputs
    if (deductFromOutputs) {
      for (let i = 0; i < this.outputs.length; i++) {
        const output = this.outputs[i];
        if (output.fixed) {
          continue;
        }
        if (collected >= targetAmount) {
          break;
        }

        const minUtxoSatoshi = output.minUtxoSatoshi ?? this.minUtxoSatoshi;
        const freeAmount = output.value - minUtxoSatoshi;
        const remain = targetAmount - collected;
        if (output.protected) {
          // If output.protected=true:
          // - Only deduct free satoshi from the output
          // - Won't destroy the output, at least keep (output.value = minUtxoSatoshi)
          const collectAmount = Math.min(freeAmount, remain);
          output.value -= collectAmount;
          collected += collectAmount;
        } else {
          // If output.protected=false:
          // - If (target collect amount > output.value), deduct all output.value
          // - Destroy the output if all value is deducted
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

    // 2. Collect from the "from" address
    if (collected < targetAmount) {
      await _collect(targetAmount - collected);
    }

    // 3. Collect from "from" one more time if:
    // - Need to create an output to return change (changeAmount > 0)
    // - The change is insufficient for a non-dust output (changeAmount < minUtxoSatoshi)
    const changeAddress = props.changeAddress ?? props.address;
    const changeToOutputs = !this.canInjectChangeToOutputs(changeAddress);
    const needChangeOutput = !changeToOutputs && changeAmount > 0 && changeAmount < this.minUtxoSatoshi;
    const changeOutputNeedAmount = needChangeOutput ? this.minUtxoSatoshi - changeAmount : 0;
    if (changeOutputNeedAmount > 0) {
      await _collect(changeOutputNeedAmount);
    }

    // 4. If not collected enough satoshi, throw an error
    const insufficientBalance = collected < targetAmount;
    if (insufficientBalance) {
      const recommendedDeposit = targetAmount - collected + this.minUtxoSatoshi;
      throw TxBuildError.withComment(
        ErrorCodes.INSUFFICIENT_UTXO,
        `expected: ${targetAmount}, actual: ${collected}. You may wanna deposit more satoshi to prevent the error, for example: ${recommendedDeposit}`,
      );
    }
    const insufficientForChange = !changeToOutputs && changeAmount > 0 && changeAmount < this.minUtxoSatoshi;
    if (insufficientForChange) {
      const shiftedExpectAmount = collected + changeOutputNeedAmount;
      throw TxBuildError.withComment(
        ErrorCodes.INSUFFICIENT_UTXO,
        `expected: ${shiftedExpectAmount}, actual: ${collected}`,
      );
    }

    // 5. Return change:
    // - If changeAmount=0, no need to create a change output, and the changeIndex=-1
    // - If changeAmount>0, return change to an output or create a change output
    let changeIndex: number = -1;
    if (changeAmount > 0) {
      const injectedChanged = await this.injectChange({
        amount: changeAmount,
        address: changeAddress,
        fromAddress: props.address,
        fromPublicKey: props.publicKey,
      });

      changeIndex = injectedChanged.changeIndex;
    }

    return {
      collected,
      changeIndex,
      changeAmount,
    };
  }

  async injectChange(props: {
    amount: number;
    address: string;
    fromAddress: string;
    fromPublicKey?: string;
    internalCacheKey?: string;
    excludeUtxos?: BaseOutput[];
  }): Promise<{
    changeIndex: number;
  }> {
    const { address, fromAddress, fromPublicKey, amount, excludeUtxos, internalCacheKey } = props;

    // If any (output.fixed != true) is found in the outputs (search in ASC order),
    // return the change value to the first matched output.
    for (let i = 0; i < this.outputs.length; i++) {
      const output = this.outputs[i];
      if (output.fixed) {
        continue;
      }
      if (!('address' in output) || output.address !== address) {
        continue;
      }

      output.value += amount;
      return {
        changeIndex: i,
      };
    }

    let changeIndex: number = -1;
    if (amount < this.minUtxoSatoshi) {
      // If the change is not enough to create a non-dust output, try collect more.
      // - injectCollected=true, expect to put all (collected + amount) of satoshi as change
      // - deductFromOutputs=false, do not collect satoshi from the outputs
      // An example:
      // 1. Expected to return change of 500 satoshi, amount=500
      // 2. Collected 2000 satoshi from the "fromAddress", collected=2000
      // 3. Create a change output and return (collected + amount), output.value=2000+500=2500
      const injected = await this.injectSatoshi({
        address: fromAddress,
        publicKey: fromPublicKey,
        targetAmount: amount,
        changeAddress: address,
        injectCollected: true,
        deductFromOutputs: false,
        internalCacheKey,
        excludeUtxos,
      });
      if (injected.collected < amount) {
        throw TxBuildError.withComment(
          ErrorCodes.INSUFFICIENT_UTXO,
          `expected: ${amount}, actual: ${injected.collected}`,
        );
      }

      changeIndex = injected.changeIndex;
    } else {
      this.addOutput({
        address: address,
        value: amount,
      });

      changeIndex = this.outputs.length - 1;
    }

    return {
      changeIndex,
    };
  }

  canInjectChangeToOutputs(changeAddress: string): boolean {
    return this.outputs.some((output) => {
      return !output.fixed && (!('address' in output) || output.address === changeAddress);
    });
  }

  async calculateFee(feeRate?: number): Promise<number> {
    if (!feeRate && !this.feeRate) {
      throw TxBuildError.withComment(ErrorCodes.INVALID_FEE_RATE, `${feeRate ?? this.feeRate}`);
    }

    const currentFeeRate = feeRate ?? this.feeRate!;

    const psbt = await this.createEstimatedPsbt();
    const tx = psbt.extractTransaction(true);

    const inputs = tx.ins.length;
    const weightWithWitness = tx.byteLength(true);
    const weightWithoutWitness = tx.byteLength(false);

    const weight = weightWithoutWitness * 3 + weightWithWitness + inputs;
    const virtualSize = Math.ceil(weight / 4);
    return Math.ceil(virtualSize * currentFeeRate);
  }

  async createEstimatedPsbt(): Promise<bitcoin.Psbt> {
    const estimator = FeeEstimator.fromRandom(this.networkType);

    const tx = this.clone();
    tx.inputs = tx.inputs.map((input) => {
      const replacedUtxo = estimator.replaceUtxo(input.utxo);
      return utxoToInput(replacedUtxo);
    });

    const psbt = tx.toPsbt();
    await estimator.signPsbt(psbt);
    return psbt;
  }

  summary() {
    const inputsTotal = this.inputs.reduce((acc, input) => acc + input.utxo.value, 0);
    const outputsTotal = this.outputs.reduce((acc, output) => acc + output.value, 0);

    const inputsRemaining = inputsTotal - outputsTotal;
    const outputsRemaining = outputsTotal - inputsTotal;

    return {
      inputsTotal,
      outputsTotal,
      inputsRemaining,
      outputsRemaining,
      needReturn: inputsRemaining > 0 ? inputsRemaining : 0,
      needCollect: outputsRemaining > 0 ? outputsRemaining : 0,
    };
  }

  clone(): TxBuilder {
    const tx = new TxBuilder({
      source: this.source,
      feeRate: this.feeRate,
      minUtxoSatoshi: this.minUtxoSatoshi,
    });

    tx.inputs = cloneDeep(this.inputs);
    tx.outputs = cloneDeep(this.outputs);

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
