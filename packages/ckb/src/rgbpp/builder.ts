import { getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';
import { Hex, IndexerCell } from '../types';
import { SECP256K1_WITNESS_LOCK_LEN } from '../constants';
import { append0x, calculateTransactionFee } from '../utils';
import { InputsCapacityNotEnoughError } from '../error';
import { Collector } from '../collector';

//TODO: waiting for SPV proof
export const appendWitnesses = (
  ckbRawTx: CKBComponents.RawTransaction,
  sumInputsCapacity: bigint,
  needPaymasterCell: boolean,
) => {
  if (!needPaymasterCell) {
    let rawTx = ckbRawTx;
    const partialOutputsCapacity = rawTx.outputs
      .slice(0, rawTx.outputs.length - 1)
      .map((output) => BigInt(output.capacity))
      .reduce((prev, current) => prev + current, BigInt(0));

    if (sumInputsCapacity <= partialOutputsCapacity) {
      throw new InputsCapacityNotEnoughError('The sum of inputs capacity is not enough');
    }

    const txSize = getTransactionSize(rawTx) + SECP256K1_WITNESS_LOCK_LEN;
    const estimatedTxFee = calculateTransactionFee(txSize);

    const changeCapacity = sumInputsCapacity - partialOutputsCapacity - estimatedTxFee;
    rawTx.outputs[rawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));
    return rawTx;
  }
};

export const appendPaymasterCell = (
  ckbRawTx: CKBComponents.RawTransaction,
  sumInputsCapacity: bigint,
  paymasterCell: IndexerCell,
) => {
  let rawTx = ckbRawTx;
  rawTx.inputs = [{ previousOutput: paymasterCell.outPoint, since: '0x0' }, ...rawTx.inputs];
  const inputsCapacity = sumInputsCapacity + BigInt(paymasterCell.output.capacity);

  const sumOutputsCapacity = rawTx.outputs
    .map((output) => BigInt(output.capacity))
    .reduce((prev, current) => prev + current, BigInt(0));

  const txSize = getTransactionSize(rawTx) + SECP256K1_WITNESS_LOCK_LEN;
  const estimatedTxFee = calculateTransactionFee(txSize);

  if (inputsCapacity <= sumOutputsCapacity) {
    throw new InputsCapacityNotEnoughError('The sum of inputs capacity is not enough');
  }
  const changeCapacity = inputsCapacity - sumOutputsCapacity - estimatedTxFee;
  rawTx.outputs[rawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  return rawTx;
};

// Only used for the ckb tx who has paymaster cell
export const signRgbppTx = async (
  secp256k1PrivateKey: Hex,
  collector: Collector,
  ckbRawTx: CKBComponents.RawTransaction,
) => {
  const signedTx = collector.getCkb().signTransaction(secp256k1PrivateKey)(ckbRawTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  return txHash;
};
