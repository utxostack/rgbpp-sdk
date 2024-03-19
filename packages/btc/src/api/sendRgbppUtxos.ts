import { helpers, Hash, RawTransaction, RPC } from '@ckb-lumos/lumos';
import { InitOutput, TxAddressOutput } from '../transaction/build';
import { ErrorCodes, TxBuildError } from '../error';
import { DataSource } from '../query/source';
import { Utxo } from '../types';
import { bitcoin } from '../bitcoin';
import { RGBPP_UTXO_DUST_LIMIT } from '../constants';
import { calculateCommitment } from '../ckb/commitment';
import { unpackRgbppLockArgs } from '../ckb/molecule';
import { getCellByOutPoint } from '../ckb/rpc';
import { sendUtxos } from './sendUtxos';

export async function sendRgbppUtxos(props: {
  ckbVirtualTx: RawTransaction;
  paymaster: TxAddressOutput;
  commitment: Hash;
  tos?: string[];

  ckbNodeUrl: string;
  rgbppLockCodeHash: Hash;
  rgbppTimeLockCodeHash: Hash;
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

  // Build TransactionSkeleton from CKB VirtualTx
  const rpc = new RPC(props.ckbNodeUrl);
  const ckbVirtualTx = props.ckbVirtualTx;
  const ckbTxSkeleton = await helpers.createTransactionSkeleton(ckbVirtualTx as any, async (outPoint) => {
    const result = await getCellByOutPoint(outPoint, rpc);
    if (!result.cell || result.status !== 'live') {
      throw new TxBuildError(ErrorCodes.CKB_CANNOT_FIND_OUTPOINT);
    }

    return result.cell;
  });

  // Handle and check inputs
  const inputCells = ckbTxSkeleton.get('inputs');
  for (let i = 0; i < inputCells.size; i++) {
    const input = inputCells.get(i)!;
    const isRgbppLock = input.cellOutput.lock.codeHash === props.rgbppLockCodeHash;
    const isRgbppTimeLock = input.cellOutput.lock.codeHash === props.rgbppTimeLockCodeHash;

    // If input.type !== null, input.lock must be RgbppLock or RgbppTimeLock
    if (input.cellOutput.type) {
      if (!isRgbppLock && !isRgbppTimeLock) {
        throw new TxBuildError(ErrorCodes.CKB_INVALID_CELL_LOCK);
      }

      // If input.type !== null，update lastTypeInput
      lastTypeInputIndex = i;
    }

    // If input.lock == RgbppLock, add to inputs if:
    // 1. input.lock.args can be unpacked to RgbppLockArgs
    // 2. utxo can be found via the DataSource.getUtxo() API
    // 3. utxo.scriptPk == addressToScriptPk(props.from)
    if (isRgbppLock || isRgbppTimeLock) {
      const args = unpackRgbppLockArgs(input.cellOutput.lock.args);
      const utxo = await props.source.getUtxo(args.btcTxId, args.outIndex);
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

    // If output.type !== null, then the output.lock must be RgbppLock or RgbppTimeLock
    if (output.type) {
      const isRgbppLock = output.lock.codeHash === props.rgbppLockCodeHash;
      const isRgbppTimeLock = output.lock.codeHash === props.rgbppTimeLockCodeHash;
      if (!isRgbppLock && !isRgbppTimeLock) {
        throw new TxBuildError(ErrorCodes.CKB_INVALID_CELL_LOCK);
      }

      // If output.type !== null，update lastTypeInput
      lastTypeOutputIndex = i;
    }

    // If output.lock == RgbppLock, generate a corresponding output in outputs
    if (output.lock.codeHash === props.rgbppLockCodeHash) {
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
