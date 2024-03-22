import { Collector, isRgbppLockCell, isBtcTimeLockCell, calculateCommitment } from '@rgbpp-sdk/ckb';
import { bitcoin } from '../bitcoin';
import { Utxo } from '../types';
import { DataSource } from '../query/source';
import { ErrorCodes, TxBuildError } from '../error';
import { InitOutput, TxAddressOutput } from '../transaction/build';
import { unpackRgbppLockArgs } from '../ckb/molecule';
import { toIsCkbMainnet } from '../network';
import { sendUtxos } from './sendUtxos';
import { RGBPP_UTXO_DUST_LIMIT } from '../constants';

export async function sendRgbppUtxos(props: {
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
}): Promise<bitcoin.Psbt> {
  const inputs: Utxo[] = [];
  const outputs: InitOutput[] = [];
  let lastTypeInputIndex = -1;
  let lastTypeOutputIndex = -1;

  const ckbVirtualTx = props.ckbVirtualTx;
  const isCkbMainnet = toIsCkbMainnet(props.source.networkType);

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
    if (isRgbppLock) {
      const args = unpackRgbppLockArgs(liveCell.output.lock.args);
      const utxo = await props.source.getUtxo(args.btcTxid, args.outIndex);
      if (!utxo) {
        throw new TxBuildError(ErrorCodes.CANNOT_FIND_UTXO);
      }
      if (utxo.address !== props.from) {
        throw new TxBuildError(ErrorCodes.REFERENCED_UNPROVABLE_UTXO);
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
      outputs.push({
        protected: true,
        address: toAddress ?? props.from,
        value: props.rgbppMinUtxoSatoshi ?? RGBPP_UTXO_DUST_LIMIT,
      });
    }
  }

  // By rules, the outputs.length should be >= 1,
  // if recipients is provided, the outputs.length should be >= recipients.length
  const recipientsLength = props.tos?.length ?? 0;
  if (outputs.length < recipientsLength) {
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

  return await sendUtxos({
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
