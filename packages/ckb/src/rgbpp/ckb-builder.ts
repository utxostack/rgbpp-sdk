import {
  getTransactionSize,
  rawTransactionToHash,
  scriptToHash,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils';
import {
  AppendBtcTxIdToLockArgsParams,
  AppendPaymasterCellAndSignTxParams,
  AppendWitnessesParams,
  SendCkbTxParams,
} from '../types';
import { SECP256K1_WITNESS_LOCK_SIZE, getRgbppLockScript } from '../constants';
import { append0x, calculateTransactionFee, isRgbppLockOrBtcTimeLock, remove0x } from '../utils';
import { InputsCapacityNotEnoughError } from '../error';
import signWitnesses from '@nervosnetwork/ckb-sdk-core/lib/signWitnesses';

// TODO: waiting for SPV btc tx proof
/**
 * Append RGBPP unlock witnesses to ckb tx and the tx can be sent to blockchain if the needPaymasterCell is false.
 * And if the needPaymasterCell is true, appending paymaster cell to inputs and signing ckb tx are required
 * @param collector The collector that collects CKB live cells and transactions
 * @param sumInputsCapacity The sum capacity of ckb inputs which is to be used to calculate ckb tx fee
 * @param needPaymasterCell The needPaymasterCell indicates whether a paymaster cell is required
 */
export const appendCkbTxWitnesses = ({ ckbRawTx, sumInputsCapacity, needPaymasterCell }: AppendWitnessesParams) => {
  const inputsCapacity = BigInt(sumInputsCapacity);
  if (!needPaymasterCell) {
    let rawTx = ckbRawTx;
    const partialOutputsCapacity = rawTx.outputs
      .slice(0, rawTx.outputs.length - 1)
      .map((output) => BigInt(output.capacity))
      .reduce((prev, current) => prev + current, BigInt(0));

    if (inputsCapacity <= partialOutputsCapacity) {
      throw new InputsCapacityNotEnoughError('The sum of inputs capacity is not enough');
    }

    const txSize = getTransactionSize(rawTx) + SECP256K1_WITNESS_LOCK_SIZE;
    const estimatedTxFee = calculateTransactionFee(txSize);

    const changeCapacity = inputsCapacity - partialOutputsCapacity - estimatedTxFee;
    rawTx.outputs[rawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));
    return rawTx;
  }
};

/**
 * Append paymaster cell to the ckb transaction inputs and sign the transaction with paymaster cell's secp256k1 private key
 * @param secp256k1PrivateKey The Secp256k1 private key of the paymaster cells maintainer
 * @param ckbRawTx CKB raw transaction
 * @param sumInputsCapacity The sum capacity of ckb inputs which is to be used to calculate ckb tx fee
 * @param paymasterCell The paymaster cell whose type is IndexerCell is used to pay the extra output cell
 */
export const appendPaymasterCellAndSignCkbTx = async ({
  secp256k1PrivateKey,
  ckbRawTx,
  sumInputsCapacity,
  paymasterCell,
  isMainnet,
}: AppendPaymasterCellAndSignTxParams) => {
  let rawTx = ckbRawTx;
  const paymasterInput = { previousOutput: paymasterCell.outPoint, since: '0x0' };
  rawTx.inputs = [paymasterInput, ...rawTx.inputs];
  const inputsCapacity = BigInt(sumInputsCapacity) + BigInt(paymasterCell.output.capacity);

  const sumOutputsCapacity: bigint = rawTx.outputs
    .map((output) => BigInt(output.capacity))
    .reduce((prev, current) => prev + current, BigInt(0));

  const txSize = getTransactionSize(rawTx) + SECP256K1_WITNESS_LOCK_SIZE;
  const estimatedTxFee = calculateTransactionFee(txSize);

  if (inputsCapacity <= sumOutputsCapacity) {
    throw new InputsCapacityNotEnoughError('The sum of inputs capacity is not enough');
  }
  const changeCapacity = inputsCapacity - sumOutputsCapacity - estimatedTxFee;
  rawTx.outputs[rawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  let keyMap = new Map<string, string>();
  keyMap.set(scriptToHash(paymasterCell.output.lock), secp256k1PrivateKey);
  keyMap.set(scriptToHash(getRgbppLockScript(isMainnet)), '');

  const cells = ckbRawTx.inputs.map((input, index) => ({
    outPoint: input.previousOutput,
    lock: index === 0 ? paymasterCell.output.lock : getRgbppLockScript(isMainnet),
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

export const sendCkbTx = async ({ collector, signedTx }: SendCkbTxParams) => {
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  return txHash;
};

/**
 * Append BTC transaction id to the rgbpp lock args and BTC time lock args
 * @param ckbRawTx CKB raw transaction
 * @param btcTxId The BTC transaction id
 * @param isMainnet
 */
export const appendBtcTxIdToLockArgs = ({ ckbRawTx, btcTxId, isMainnet }: AppendBtcTxIdToLockArgsParams) => {
  const outputs = ckbRawTx.outputs
    .filter((output) => isRgbppLockOrBtcTimeLock(output.lock, isMainnet))
    .map((output) => ({
      ...output,
      lock: {
        ...output.lock,
        args: `${output.lock.args}${remove0x(btcTxId)}`,
      },
    }));
  const newRawTx: CKBComponents.RawTransaction = {
    ...ckbRawTx,
    outputs,
  };
  return newRawTx;
};
