import {
  AppendIssuerCellToBtcBatchTransfer,
  BtcBatchTransferVirtualTxParams,
  BtcBatchTransferVirtualTxResult,
  BtcTransferVirtualTxParams,
  BtcTransferVirtualTxResult,
  RgbppCkbVirtualTx,
} from '../types/rgbpp';
import { blockchain } from '@ckb-lumos/base';
import { NoLiveCellError, NoRgbppLiveCellError, TypeAssetNotSupportedError } from '../error';
import { append0x, calculateRgbppCellCapacity, calculateTransactionFee, isUDTTypeSupported, u128ToLe } from '../utils';
import {
  buildPreLockArgs,
  calculateCommitment,
  compareInputs,
  estimateWitnessSize,
  genRgbppLockScript,
  throwErrorWhenTxInputsExceeded,
} from '../utils/rgbpp';
import { Hex, IndexerCell } from '../types';
import {
  MAX_FEE,
  MIN_CAPACITY,
  RGBPP_WITNESS_PLACEHOLDER,
  SECP256K1_WITNESS_LOCK_SIZE,
  getRgbppLockConfigDep,
  getRgbppLockDep,
  getRgbppLockScript,
  getSecp256k1CellDep,
  getXudtDep,
} from '../constants';
import {
  addressToScript,
  getTransactionSize,
  rawTransactionToHash,
  scriptToHash,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils';
import signWitnesses from '@nervosnetwork/ckb-sdk-core/lib/signWitnesses';

/**
 * Generate the virtual ckb transaction for the btc transfer tx
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred, if the noMergeOutputCells is true, the transferAmount will be ignored
 * @param isMainnet
 * @param noMergeOutputCells The noMergeOutputCells indicates whether the CKB outputs need to be merged. By default, the outputs will be merged.
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genBtcTransferCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  transferAmount,
  isMainnet,
  noMergeOutputCells,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: BtcTransferVirtualTxParams): Promise<BtcTransferVirtualTxResult> => {
  const xudtType = blockchain.Script.unpack(xudtTypeBytes) as CKBComponents.Script;

  if (!isUDTTypeSupported(xudtType, isMainnet)) {
    throw new TypeAssetNotSupportedError('The type script asset is not supported now');
  }

  const rgbppLocks = rgbppLockArgsList.map((args) => genRgbppLockScript(args, isMainnet));
  let rgbppCells: IndexerCell[] = [];
  for await (const rgbppLock of rgbppLocks) {
    const cells = await collector.getCells({ lock: rgbppLock, type: xudtType });
    if (!cells || cells.length === 0) {
      throw new NoRgbppLiveCellError('No rgbpp cells found with the xudt type script and the rgbpp lock args');
    }
    rgbppCells = [...rgbppCells, ...cells];
  }
  rgbppCells = rgbppCells.sort(compareInputs);

  let inputs: CKBComponents.CellInput[] = [];
  let sumInputsCapacity = BigInt(0);
  let outputs: CKBComponents.CellOutput[] = [];
  let outputsData: Hex[] = [];
  let changeCapacity = BigInt(0);

  if (noMergeOutputCells) {
    for (const [index, rgbppCell] of rgbppCells.entries()) {
      inputs.push({
        previousOutput: rgbppCell.outPoint,
        since: '0x0',
      });
      sumInputsCapacity += BigInt(rgbppCell.output.capacity);
      outputs.push({
        ...rgbppCell.output,
        // The Vouts[0] for OP_RETURN and Vouts[1], Vouts[2], ... for RGBPP assets
        lock: genRgbppLockScript(buildPreLockArgs(index + 1), isMainnet),
      });
      outputsData.push(rgbppCell.outputData);
    }
    changeCapacity = BigInt(rgbppCells[rgbppCells.length - 1].output.capacity);
  } else {
    const collectResult = collector.collectUdtInputs({
      liveCells: rgbppCells,
      needAmount: transferAmount,
    });
    inputs = collectResult.inputs;

    throwErrorWhenTxInputsExceeded(inputs.length);

    sumInputsCapacity = collectResult.sumInputsCapacity;

    rgbppCells = rgbppCells.slice(0, inputs.length);

    const rpbppCellCapacity = calculateRgbppCellCapacity(xudtType);
    outputsData.push(append0x(u128ToLe(transferAmount)));

    changeCapacity = sumInputsCapacity;
    // The Vouts[0] for OP_RETURN and Vouts[1], Vouts[2], ... for RGBPP assets
    outputs.push({
      lock: genRgbppLockScript(buildPreLockArgs(1), isMainnet),
      type: xudtType,
      capacity: append0x(rpbppCellCapacity.toString(16)),
    });
    if (collectResult.sumAmount > transferAmount) {
      outputs.push({
        lock: genRgbppLockScript(buildPreLockArgs(2), isMainnet),
        type: xudtType,
        capacity: append0x(rpbppCellCapacity.toString(16)),
      });
      outputsData.push(append0x(u128ToLe(collectResult.sumAmount - transferAmount)));
      changeCapacity -= rpbppCellCapacity;
    }
  }

  const cellDeps = [getRgbppLockDep(isMainnet), getXudtDep(isMainnet), getRgbppLockConfigDep(isMainnet)];
  const needPaymasterCell = inputs.length < outputs.length;
  if (needPaymasterCell) {
    cellDeps.push(getSecp256k1CellDep(isMainnet));
  }
  const witnesses: Hex[] = [];
  const lockArgsSet: Set<string> = new Set();
  for (const cell of rgbppCells) {
    if (lockArgsSet.has(cell.output.lock.args)) {
      witnesses.push('0x');
    } else {
      lockArgsSet.add(cell.output.lock.args);
      witnesses.push(RGBPP_WITNESS_PLACEHOLDER);
    }
  }

  const ckbRawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  if (!needPaymasterCell) {
    const txSize =
      getTransactionSize(ckbRawTx) + (witnessLockPlaceholderSize ?? estimateWitnessSize(rgbppLockArgsList));
    const estimatedTxFee = calculateTransactionFee(txSize, ckbFeeRate);

    changeCapacity -= estimatedTxFee;
    ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));
  }

  const virtualTx: RgbppCkbVirtualTx = {
    ...ckbRawTx,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
    needPaymasterCell,
    sumInputsCapacity: append0x(sumInputsCapacity.toString(16)),
  };
};

/**
 * Generate the virtual ckb transaction for the btc batch transfer tx
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param rgbppReceivers The rgbpp receiver list which include toBtcAddress and transferAmount
 * @param isMainnet
 */
export const genBtcBatchTransferCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  rgbppReceivers,
  isMainnet,
}: BtcBatchTransferVirtualTxParams): Promise<BtcBatchTransferVirtualTxResult> => {
  const xudtType = blockchain.Script.unpack(xudtTypeBytes) as CKBComponents.Script;

  if (!isUDTTypeSupported(xudtType, isMainnet)) {
    throw new TypeAssetNotSupportedError('The type script asset is not supported now');
  }

  const rgbppLocks = rgbppLockArgsList.map((args) => genRgbppLockScript(args, isMainnet));
  let rgbppCells: IndexerCell[] = [];
  for await (const rgbppLock of rgbppLocks) {
    const cells = await collector.getCells({ lock: rgbppLock, type: xudtType });
    if (!cells || cells.length === 0) {
      throw new NoRgbppLiveCellError('No rgbpp cells found with the xudt type script and the rgbpp lock args');
    }
    rgbppCells = [...rgbppCells, ...cells];
  }
  rgbppCells = rgbppCells.sort(compareInputs);

  const sumTransferAmount = rgbppReceivers
    .map((receiver) => receiver.transferAmount)
    .reduce((prev, current) => prev + current, BigInt(0));

  const rpbppCellCapacity = calculateRgbppCellCapacity(xudtType);
  const outputs: CKBComponents.CellOutput[] = rgbppReceivers.map((_, index) => ({
    // The Vouts[0] for OP_RETURN and Vouts[1], Vouts[2], ... for RGBPP assets
    lock: genRgbppLockScript(buildPreLockArgs(index + 1), isMainnet),
    type: xudtType,
    capacity: append0x(rpbppCellCapacity.toString(16)),
  }));
  const outputsData = rgbppReceivers.map((receiver) => append0x(u128ToLe(receiver.transferAmount)));

  const { inputs, sumInputsCapacity, sumAmount } = collector.collectUdtInputs({
    liveCells: rgbppCells,
    needAmount: sumTransferAmount,
  });

  throwErrorWhenTxInputsExceeded(inputs.length);

  // Rgbpp change cell index, if it is -1, it means there is no change rgbpp cell
  let rgbppChangeOutIndex = -1;
  if (sumAmount > sumTransferAmount) {
    // Rgbpp change cell is placed at the last position by default
    const lastUtxoIndex = rgbppReceivers.length + 1;
    rgbppChangeOutIndex = lastUtxoIndex;
    outputs.push({
      // The Vouts[0] for OP_RETURN and Vouts[1], Vouts[2], ... for RGBPP assets
      lock: genRgbppLockScript(buildPreLockArgs(lastUtxoIndex), isMainnet),
      type: xudtType,
      capacity: append0x(rpbppCellCapacity.toString(16)),
    });
    outputsData.push(append0x(u128ToLe(sumAmount - sumTransferAmount)));
  }

  const cellDeps = [
    getRgbppLockDep(isMainnet),
    getXudtDep(isMainnet),
    getRgbppLockConfigDep(isMainnet),
    getSecp256k1CellDep(isMainnet),
  ];
  const witnesses: Hex[] = inputs.map((_, index) => (index === 0 ? RGBPP_WITNESS_PLACEHOLDER : '0x'));

  const ckbRawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  const virtualTx: RgbppCkbVirtualTx = {
    ...ckbRawTx,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
    rgbppChangeOutIndex,
    needPaymasterCell: false,
    sumInputsCapacity: append0x(sumInputsCapacity.toString(16)),
  };
};

/**
 * Append paymaster cell to the ckb transaction inputs and sign the transaction with paymaster cell's secp256k1 private key
 * @param secp256k1PrivateKey The Secp256k1 private key of the paymaster cells maintainer
 * @param issuerAddress The issuer ckb address
 * @param collector The collector that collects CKB live cells and transactions
 * @param ckbRawTx CKB raw transaction
 * @param sumInputsCapacity The sum capacity of ckb inputs which is to be used to calculate ckb tx fee
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const appendIssuerCellToBtcBatchTransfer = async ({
  secp256k1PrivateKey,
  issuerAddress,
  collector,
  ckbRawTx,
  sumInputsCapacity,
  isMainnet,
  ckbFeeRate,
}: AppendIssuerCellToBtcBatchTransfer): Promise<CKBComponents.RawTransaction> => {
  let rawTx = ckbRawTx as CKBComponents.RawTransactionToSign;

  const rgbppInputsLength = rawTx.inputs.length;

  const sumOutputsCapacity: bigint = rawTx.outputs
    .map((output) => BigInt(output.capacity))
    .reduce((prev, current) => prev + current, BigInt(0));

  const issuerLock = addressToScript(issuerAddress);
  let emptyCells = await collector.getCells({ lock: issuerLock });
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellError('The issuer address has no empty cells');
  }
  emptyCells = emptyCells.filter((cell) => !cell.output.type);

  let actualInputsCapacity = BigInt(sumInputsCapacity);
  let txFee = MAX_FEE;
  if (actualInputsCapacity <= sumOutputsCapacity) {
    const needCapacity = sumOutputsCapacity - actualInputsCapacity + MIN_CAPACITY;
    const { inputs, sumInputsCapacity: sumEmptyCapacity } = collector.collectInputs(emptyCells, needCapacity, txFee);
    rawTx.inputs = [...rawTx.inputs, ...inputs];
    actualInputsCapacity += sumEmptyCapacity;
  }

  let changeCapacity = actualInputsCapacity - sumOutputsCapacity;
  const changeOutput = {
    lock: issuerLock,
    capacity: append0x(changeCapacity.toString(16)),
  };
  rawTx.outputs = [...rawTx.outputs, changeOutput];
  rawTx.outputsData = [...rawTx.outputsData, '0x'];

  const txSize = getTransactionSize(rawTx) + SECP256K1_WITNESS_LOCK_SIZE;
  const estimatedTxFee = calculateTransactionFee(txSize, ckbFeeRate);
  changeCapacity -= estimatedTxFee;
  rawTx.outputs[rawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  let keyMap = new Map<string, string>();
  keyMap.set(scriptToHash(issuerLock), secp256k1PrivateKey);
  keyMap.set(scriptToHash(getRgbppLockScript(isMainnet)), '');

  const issuerCellIndex = rgbppInputsLength;
  const cells = rawTx.inputs.map((input, index) => ({
    outPoint: input.previousOutput,
    lock: index >= issuerCellIndex ? issuerLock : getRgbppLockScript(isMainnet),
  }));

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const issuerWitnesses = rawTx.inputs.slice(rgbppInputsLength).map((_, index) => (index === 0 ? emptyWitness : '0x'));
  rawTx.witnesses = [...rawTx.witnesses, ...issuerWitnesses];

  const transactionHash = rawTransactionToHash(rawTx);
  const signedWitnesses = signWitnesses(keyMap)({
    transactionHash,
    witnesses: rawTx.witnesses,
    inputCells: cells,
    skipMissingKeys: true,
  });

  const signedTx = {
    ...rawTx,
    witnesses: signedWitnesses.map((witness) =>
      typeof witness !== 'string' ? serializeWitnessArgs(witness) : witness,
    ),
  };
  return signedTx;
};
