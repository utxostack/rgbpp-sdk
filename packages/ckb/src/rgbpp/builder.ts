import {
  getTransactionSize,
  rawTransactionToHash,
  scriptToHash,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils';
import { AppendPaymasterCellAndSignTxParams, AppendWitnessesParams, SendTxParams } from '../types';
import { SECP256K1_WITNESS_LOCK_LEN, getRgbppLockScript } from '../constants';
import { append0x, calculateTransactionFee } from '../utils';
import { InputsCapacityNotEnoughError } from '../error';
import signWitnesses from '@nervosnetwork/ckb-sdk-core/lib/signWitnesses';

//TODO: waiting for SPV proof
export const appendWitnesses = ({ ckbRawTx, sumInputsCapacity, needPaymasterCell }: AppendWitnessesParams) => {
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

export const appendPaymasterCellAndSignTx = async ({
  secp256k1PrivateKey,
  ckbRawTx,
  sumInputsCapacity,
  paymasterCell,
}: AppendPaymasterCellAndSignTxParams) => {
  let rawTx = ckbRawTx;
  const paymasterInput = { previousOutput: paymasterCell.outPoint, since: '0x0' };
  rawTx.inputs = [paymasterInput, ...rawTx.inputs];
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

  let keyMap = new Map<string, string>();
  keyMap.set(scriptToHash(paymasterCell.output.lock), secp256k1PrivateKey);
  // The 0x00 is placeholder for rpbpp cell and it has no effect on transaction signatures
  keyMap.set('0x00', '');

  const cells = ckbRawTx.inputs.map((input, index) => ({
    outPoint: input.previousOutput,
    lock: index === 0 ? paymasterCell.output.lock : getRgbppLockScript(false),
  }));

  const transactionHash = rawTransactionToHash(rawTx);
  const signedWitnesses = signWitnesses(keyMap)({
    transactionHash,
    witnesses: rawTx.witnesses,
    inputCells: cells,
    skipMissingKeys: true,
  });
  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const signedTx = {
    ...rawTx,
    witnesses: signedWitnesses.map((witness, index) => (index === 0 ? serializeWitnessArgs(emptyWitness) : witness)),
  };
  return signedTx;
};

export const sendCkbTx = async ({ collector, signedTx }: SendTxParams) => {
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  return txHash;
};
