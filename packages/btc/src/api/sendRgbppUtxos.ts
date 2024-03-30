import { Collector, isRgbppLockCell, isBtcTimeLockCell, calculateCommitment } from '@rgbpp-sdk/ckb';
import { bitcoin } from '../bitcoin';
import { Utxo } from '../transaction/utxo';
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

  from: string;
  source: DataSource;
  fromPubkey?: string;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  feeRate?: number;
}

export async function sendRgbppUtxosBuilder(props: SendRgbppUtxosProps): Promise<{
  builder: TxBuilder;
  feeRate: number;
  fee: number;
}> {
  const inputs: Utxo[] = [];
  const outputs: InitOutput[] = [];
  let lastTypeInputIndex = -1;
  let lastTypeOutputIndex = -1;

  const ckbVirtualTx = props.ckbVirtualTx;
  const config = networkTypeToConfig(props.source.networkType);
  const isCkbMainnet = props.source.networkType === NetworkType.MAINNET;

  // Handle and check inputs
  for (let i = 0; i < ckbVirtualTx.inputs.length; i++) {
    const input = ckbVirtualTx.inputs[i];

    const liveCell = await props.ckbCollector.getLiveCell(input.previousOutput!);
    const isRgbppLock = isRgbppLockCell(liveCell.output, isCkbMainnet);

    // If input.type !== null, input.lock must be RgbppLock or RgbppTimeLock
    if (liveCell.output.type) {
      if (!isRgbppLock) {
        throw new TxBuildError(ErrorCodes.CKB_INVALID_CELL_LOCK);
      }

      // If input.type !== null，update lastTypeInput
      lastTypeInputIndex = i;
    }

    // If input.lock == RgbppLock, add to inputs if:
    // 1. input.lock.args can be unpacked to RgbppLockArgs
    // 2. utxo can be found via the DataSource.getUtxo() API
    // 3. utxo.scriptPk == addressToScriptPk(props.from)
    // 4. utxo is not duplicated in the inputs
    if (isRgbppLock) {
      const args = unpackRgbppLockArgs(liveCell.output.lock.args);
      const utxo = await props.source.getUtxo(args.btcTxid, args.outIndex);
      if (!utxo) {
        throw new TxBuildError(ErrorCodes.CANNOT_FIND_UTXO);
      }
      if (utxo.address !== props.from) {
        throw new TxBuildError(ErrorCodes.REFERENCED_UNPROVABLE_UTXO);
      }

      const foundInInputs = inputs.some((v) => v.txid === utxo.txid && v.vout === utxo.vout);
      if (foundInInputs) {
        continue;
      }

      inputs.push({
        ...utxo,
        pubkey: props.fromPubkey, // For P2TR addresses, a pubkey is required
      });
    }
  }

  // The inputs.length should be >= 1
  if (inputs.length < 1) {
    throw new TxBuildError(ErrorCodes.CKB_INVALID_INPUTS);
  }

  // Handle and check outputs
  for (let i = 0; i < ckbVirtualTx.outputs.length; i++) {
    const output = ckbVirtualTx.outputs[i];
    const isRgbppLock = isRgbppLockCell(output, isCkbMainnet);
    const isRgbppTimeLock = isBtcTimeLockCell(output, isCkbMainnet);

    // If output.type !== null, then the output.lock must be RgbppLock or RgbppTimeLock
    if (output.type) {
      if (!isRgbppLock && !isRgbppTimeLock) {
        throw new TxBuildError(ErrorCodes.CKB_INVALID_CELL_LOCK);
      }

      // If output.type !== null，update lastTypeInput
      lastTypeOutputIndex = i;
    }

    // If output.lock == RgbppLock, generate a corresponding output in outputs
    if (isRgbppLock) {
      const toAddress = props.tos?.[i];
      const minUtxoSatoshi = props.rgbppMinUtxoSatoshi ?? config.rgbppUtxoDustLimit;
      outputs.push({
        fixed: true,
        address: toAddress ?? props.from,
        value: minUtxoSatoshi,
        minUtxoSatoshi,
      });
    }
  }

  // By rules, the length of type outputs should be >= 1
  // The "lastTypeOutputIndex" is -1 by default so if (index < 0) it's invalid
  if (lastTypeOutputIndex < 0) {
    throw new TxBuildError(ErrorCodes.CKB_INVALID_OUTPUTS);
  }

  // Verify the provided commitment
  const calculatedCommitment = calculateCommitment({
    inputs: [...ckbVirtualTx.inputs].slice(0, lastTypeInputIndex + 1),
    outputs: [...ckbVirtualTx.outputs].slice(0, lastTypeOutputIndex + 1),
    outputsData: [...ckbVirtualTx.outputsData].slice(0, lastTypeOutputIndex + 1),
  });
  if (props.commitment !== calculatedCommitment) {
    throw new TxBuildError(ErrorCodes.CKB_UNMATCHED_COMMITMENT);
  }

  const mergedOutputs = (() => {
    const merged: InitOutput[] = [];

    // Add commitment to the beginning of outputs
    merged.push({
      data: props.commitment,
      fixed: true,
      value: 0,
    });

    // Add outputs
    merged.push(...outputs);

    // Add paymaster if provided
    if (props.paymaster) {
      merged.push({
        ...props.paymaster,
        fixed: true,
      });
    }

    return merged;
  })();

  return await createSendUtxosBuilder({
    inputs,
    outputs: mergedOutputs,
    from: props.from,
    source: props.source,
    fromPubkey: props.fromPubkey,
    changeAddress: props.changeAddress,
    minUtxoSatoshi: props.minUtxoSatoshi,
    feeRate: props.feeRate,
  });
}

export async function sendRgbppUtxos(props: SendRgbppUtxosProps): Promise<bitcoin.Psbt> {
  const { builder } = await sendRgbppUtxosBuilder(props);
  return builder.toPsbt();
}
