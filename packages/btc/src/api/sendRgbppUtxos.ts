import { Collector, checkCkbTxInputsCapacitySufficient } from '@rgbpp-sdk/ckb';
import { isRgbppLockCell, isBtcTimeLockCell, calculateCommitment } from '@rgbpp-sdk/ckb';
import { bitcoin } from '../bitcoin';
import { BaseOutput, Utxo } from '../transaction/utxo';
import { DataSource } from '../query/source';
import { NetworkType } from '../preset/types';
import { ErrorCodes, TxBuildError } from '../error';
import { InitOutput, TxAddressOutput, TxBuilder } from '../transaction/build';
import { networkTypeToConfig } from '../preset/config';
import { unpackRgbppLockArgs } from '../ckb/molecule';
import { createSendUtxosBuilder } from './sendUtxos';

export interface SendRgbppUtxosProps {
  ckbVirtualTx: CKBComponents.RawTransaction;
  commitment: string;
  tos?: string[];
  paymaster?: TxAddressOutput;

  ckbCollector: Collector;
  rgbppMinUtxoSatoshi?: number;

  source: DataSource;
  from: string;
  feeRate?: number;
  fromPubkey?: string;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  onlyConfirmedUtxos?: boolean;
  excludeUtxos?: BaseOutput[];
}

/**
 * @deprecated Use createSendRgbppUtxosBuilder() API instead.
 */
export const sendRgbppUtxosBuilder = createSendRgbppUtxosBuilder;

export async function createSendRgbppUtxosBuilder(props: SendRgbppUtxosProps): Promise<{
  builder: TxBuilder;
  fee: number;
  feeRate: number;
  changeIndex: number;
}> {
  const btcInputs: Utxo[] = [];
  const btcOutputs: InitOutput[] = [];
  let lastCkbTypeOutputIndex = -1;

  const ckbVirtualTx = props.ckbVirtualTx;
  const config = networkTypeToConfig(props.source.networkType);
  const isCkbMainnet = props.source.networkType === NetworkType.MAINNET;

  // Handle and check inputs
  for (let i = 0; i < ckbVirtualTx.inputs.length; i++) {
    const ckbInput = ckbVirtualTx.inputs[i];

    const ckbLiveCell = await props.ckbCollector.getLiveCell(ckbInput.previousOutput!);
    const isRgbppLock = isRgbppLockCell(ckbLiveCell.output, isCkbMainnet);

    // If input.lock == RgbppLock, add to inputs if:
    // 1. input.lock.args can be unpacked to RgbppLockArgs
    // 2. utxo can be found via the DataSource.getUtxo() API
    // 3. utxo.scriptPk == addressToScriptPk(props.from)
    // 4. utxo is not duplicated in the inputs
    if (isRgbppLock) {
      const args = unpackRgbppLockArgs(ckbLiveCell.output.lock.args);
      const utxo = await props.source.getUtxo(args.btcTxid, args.outIndex, props.onlyConfirmedUtxos);
      if (!utxo) {
        throw TxBuildError.withComment(ErrorCodes.CANNOT_FIND_UTXO, `hash: ${args.btcTxid}, index: ${args.outIndex}`);
      }
      if (utxo.address !== props.from) {
        throw TxBuildError.withComment(
          ErrorCodes.REFERENCED_UNPROVABLE_UTXO,
          `hash: ${args.btcTxid}, index: ${args.outIndex}`,
        );
      }

      const foundInInputs = btcInputs.some((v) => v.txid === utxo.txid && v.vout === utxo.vout);
      if (foundInInputs) {
        continue;
      }

      btcInputs.push({
        ...utxo,
        pubkey: props.fromPubkey, // For P2TR addresses, a pubkey is required
      });
    }
  }

  // The inputs.length should be >= 1
  if (btcInputs.length < 1) {
    throw new TxBuildError(ErrorCodes.CKB_INVALID_INPUTS);
  }

  // Handle and check outputs
  for (let i = 0; i < ckbVirtualTx.outputs.length; i++) {
    const ckbOutput = ckbVirtualTx.outputs[i];
    const isRgbppLock = isRgbppLockCell(ckbOutput, isCkbMainnet);
    const isBtcTimeLock = isBtcTimeLockCell(ckbOutput, isCkbMainnet);

    // If output.type !== null, then the output.lock must be RgbppLock or RgbppTimeLock
    if (ckbOutput.type) {
      if (!isRgbppLock && !isBtcTimeLock) {
        throw new TxBuildError(ErrorCodes.CKB_INVALID_CELL_LOCK);
      }

      // If output.type !== null，update lastTypeInput
      lastCkbTypeOutputIndex = i;
    }

    // If output.lock == RgbppLock, generate a corresponding output in outputs
    if (isRgbppLock) {
      const toBtcAddress = props.tos?.[i];
      const minUtxoSatoshi = props.rgbppMinUtxoSatoshi ?? config.rgbppUtxoDustLimit;
      btcOutputs.push({
        fixed: true,
        address: toBtcAddress ?? props.from,
        value: minUtxoSatoshi,
        minUtxoSatoshi,
      });
    }
  }

  // By rules, the length of type outputs should be >= 1
  // The "lastTypeOutputIndex" is -1 by default so if (index < 0) it's invalid
  if (lastCkbTypeOutputIndex < 0) {
    throw new TxBuildError(ErrorCodes.CKB_INVALID_OUTPUTS);
  }

  // Verify the provided commitment
  const calculatedCommitment = calculateCommitment({
    inputs: ckbVirtualTx.inputs,
    outputs: ckbVirtualTx.outputs.slice(0, lastCkbTypeOutputIndex + 1),
    outputsData: ckbVirtualTx.outputsData.slice(0, lastCkbTypeOutputIndex + 1),
  });
  if (props.commitment !== calculatedCommitment) {
    throw new TxBuildError(ErrorCodes.CKB_UNMATCHED_COMMITMENT);
  }

  const mergedBtcOutputs = await getMergedBtcOutputs(btcOutputs, props);

  return await createSendUtxosBuilder({
    inputs: btcInputs,
    outputs: mergedBtcOutputs,
    from: props.from,
    source: props.source,
    feeRate: props.feeRate,
    fromPubkey: props.fromPubkey,
    changeAddress: props.changeAddress,
    minUtxoSatoshi: props.minUtxoSatoshi,
    onlyConfirmedUtxos: props.onlyConfirmedUtxos,
    excludeUtxos: props.excludeUtxos,
  });
}

async function getMergedBtcOutputs(btcOutputs: InitOutput[], props: SendRgbppUtxosProps): Promise<InitOutput[]> {
  const merged: InitOutput[] = [];

  // Add commitment to the beginning of outputs
  merged.push({
    data: props.commitment,
    fixed: true,
    value: 0,
  });

  // Add outputs
  merged.push(...btcOutputs);

  // Check paymaster info
  const defaultPaymaster = await props.source.getPaymasterOutput();
  const isPaymasterUnmatched =
    defaultPaymaster?.address !== props.paymaster?.address || defaultPaymaster?.value !== props.paymaster?.value;
  if (defaultPaymaster && props.paymaster && isPaymasterUnmatched) {
    throw TxBuildError.withComment(
      ErrorCodes.PAYMASTER_MISMATCH,
      `expected: ${defaultPaymaster}, actual: ${props.paymaster}`,
    );
  }

  // Add paymaster output, only if paymaster address exists and needed
  const paymaster = defaultPaymaster ?? props.paymaster;
  const isCkbTxCapacitySufficient = await checkCkbTxInputsCapacitySufficient(props.ckbVirtualTx, props.ckbCollector);
  if (paymaster && !isCkbTxCapacitySufficient) {
    merged.push({
      ...paymaster,
      fixed: true,
    });
  }

  return merged;
}

export async function sendRgbppUtxos(props: SendRgbppUtxosProps): Promise<bitcoin.Psbt> {
  const { builder } = await createSendRgbppUtxosBuilder(props);
  return builder.toPsbt();
}
