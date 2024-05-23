import { BaseOutput, Utxo } from '../transaction/utxo';
import { DataSource } from '../query/source';
import { ErrorCodes, TxBuildError } from '../error';
import { InitOutput, TxBuilder } from '../transaction/build';
import { isOpReturnScriptPubkey } from '../transaction/embed';
import { networkTypeToNetwork } from '../preset/network';
import { networkTypeToConfig } from '../preset/config';
import { createSendUtxosBuilder } from './sendUtxos';
import { isP2trScript } from '../script';
import { bitcoin } from '../bitcoin';

export interface SendRbfProps {
  from: string;
  txHex: string;
  source: DataSource;
  feeRate?: number;
  fromPubkey?: string;
  changeIndex?: number;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  onlyConfirmedUtxos?: boolean;
  requireValidOutputsValue?: boolean;
  requireGreaterFeeAndRate?: boolean;

  // EXPERIMENTAL: the below props are unstable and can be altered at any time
  inputsPubkey?: Record<string, string>; // Record<address, pubkey>
}

export async function createSendRbfBuilder(props: SendRbfProps): Promise<{
  builder: TxBuilder;
  fee: number;
  feeRate: number;
  changeIndex: number;
}> {
  const previousTx = bitcoin.Transaction.fromHex(props.txHex);
  const network = networkTypeToNetwork(props.source.networkType);

  // Rebuild inputs
  const inputs: Utxo[] = [];
  for (const input of previousTx.ins) {
    const hash = Buffer.from(input.hash).reverse().toString('hex');
    const utxo = await props.source.getUtxo(hash, input.index);
    if (!utxo) {
      throw TxBuildError.withComment(ErrorCodes.CANNOT_FIND_UTXO, `hash: ${hash}, index: ${input.index}`);
    }

    // Ensure each P2TR input has a corresponding pubkey
    const fromPubkey = utxo.address === props.from ? props.fromPubkey : undefined;
    const inputPubkey = props.inputsPubkey?.[utxo.address];
    const pubkey = inputPubkey ?? fromPubkey;
    if (pubkey) {
      utxo.pubkey = pubkey;
    }
    if (isP2trScript(utxo.scriptPk) && !utxo.pubkey) {
      throw TxBuildError.withComment(ErrorCodes.MISSING_PUBKEY, utxo.address);
    }

    inputs.push(utxo);
  }

  // Rebuild outputs
  const requireValidOutputsValue = props.requireValidOutputsValue ?? false;
  const outputs: InitOutput[] = previousTx.outs.map((output) => {
    if (isOpReturnScriptPubkey(output.script)) {
      return {
        script: output.script,
        value: output.value,
        fixed: true,
      };
    } else {
      return {
        minUtxoSatoshi: requireValidOutputsValue ? undefined : output.value,
        address: bitcoin.address.fromOutputScript(output.script, network),
        value: output.value,
        fixed: true,
      };
    }
  });

  // Set change output if specified
  let changeAddress: string | undefined = props.changeAddress;
  if (props.changeIndex !== undefined) {
    const changeOutput = outputs[props.changeIndex];
    const isReturnableOutput = changeOutput && 'address' in changeOutput;
    const changeOutputAddress = isReturnableOutput ? changeOutput.address : undefined;
    if (!changeOutput) {
      throw TxBuildError.withComment(ErrorCodes.INVALID_CHANGE_OUTPUT, `outputs[${props.changeIndex}] is not found`);
    }
    if (!isReturnableOutput) {
      throw TxBuildError.withComment(
        ErrorCodes.INVALID_CHANGE_OUTPUT,
        `outputs[${props.changeIndex}] is not a returnable output for change`,
      );
    }
    if (changeOutputAddress && changeAddress && changeAddress !== changeOutputAddress) {
      throw TxBuildError.withComment(
        ErrorCodes.INVALID_CHANGE_OUTPUT,
        `outputs[${props.changeIndex}].address does not match the specified changeAddress`,
      );
    }
    if (changeOutputAddress && !changeAddress) {
      changeAddress = changeOutputAddress;
    }

    const config = networkTypeToConfig(props.source.networkType);
    const minUtxoSatoshi = props.minUtxoSatoshi ?? config.btcUtxoDustLimit;
    changeOutput.minUtxoSatoshi = minUtxoSatoshi;
    changeOutput.value = minUtxoSatoshi;
    changeOutput.protected = true;
    changeOutput.fixed = false;
  }

  // Fee rate
  const requireGreaterFeeAndRate = props.requireGreaterFeeAndRate ?? true;
  let feeRate: number | undefined = props.feeRate;
  if (requireGreaterFeeAndRate && !feeRate) {
    const feeRates = await props.source.service.getBtcRecommendedFeeRates();
    feeRate = feeRates.fastestFee;
  }

  // The RBF transaction should offer a higher fee rate
  const previousInsValue = inputs.reduce((sum, input) => sum + input.value, 0);
  const previousOutsValue = previousTx.outs.reduce((sum, output) => sum + output.value, 0);
  const previousFee = previousInsValue - previousOutsValue;
  const previousFeeRate = Math.floor(previousFee / previousTx.virtualSize());
  console.log(previousFeeRate, feeRate);
  if (requireGreaterFeeAndRate && feeRate !== undefined && feeRate <= previousFeeRate) {
    throw TxBuildError.withComment(
      ErrorCodes.INVALID_FEE_RATE,
      `RBF should offer a higher fee rate, previous: ${previousFeeRate}, current: ${feeRate}`,
    );
  }

  // Exclude the previous transaction's outputs during the collection
  const previousTxId = previousTx.getId();
  const excludeUtxos: BaseOutput[] = previousTx.outs.map((_, index) => ({
    txid: previousTxId,
    vout: index,
  }));

  // Build RBF transaction
  const res = await createSendUtxosBuilder({
    inputs,
    outputs,
    excludeUtxos,
    changeAddress,
    from: props.from,
    source: props.source,
    feeRate: props.feeRate,
    fromPubkey: props.fromPubkey,
    minUtxoSatoshi: props.minUtxoSatoshi,
    onlyConfirmedUtxos: props.onlyConfirmedUtxos,
  });

  // The RBF transaction should offer a higher fee amount
  if (requireGreaterFeeAndRate && res.fee <= previousFee) {
    throw TxBuildError.withComment(
      ErrorCodes.INVALID_FEE_RATE,
      `RBF should offer a higher fee amount, previous: ${previousFee}, current: ${res.fee}`,
    );
  }

  return res;
}

export async function sendRbf(props: SendRbfProps): Promise<bitcoin.Psbt> {
  const { builder } = await createSendRbfBuilder(props);
  return builder.toPsbt();
}
