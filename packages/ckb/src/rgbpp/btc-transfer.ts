import {
  AppendIssuerCellToBtcBatchTransfer,
  BtcBatchTransferVirtualTxParams,
  BtcBatchTransferVirtualTxResult,
  BtcTransferVirtualTxParams,
  BtcTransferVirtualTxResult,
  RgbppCkbVirtualTx,
} from '../types/rgbpp';
import { NoLiveCellError, NoRgbppLiveCellError, TypeAssetNotSupportedError } from '../error';
import {
  append0x,
  calculateRgbppCellCapacity,
  calculateTransactionFee,
  deduplicateList,
  fetchTypeIdCellDeps,
  isScriptEqual,
  isUDTTypeSupported,
  u128ToLe,
  buildPreLockArgs,
  calculateCommitment,
  compareInputs,
  estimateWitnessSize,
  genRgbppLockScript,
  isRgbppCapacitySufficientForChange,
  throwErrorWhenRgbppCellsInvalid,
  throwErrorWhenTxInputsExceeded,
  isStandardUDTTypeSupported,
} from '../utils';
import { Hex, IndexerCell } from '../types';
import {
  MAX_FEE,
  MIN_CAPACITY,
  RGBPP_WITNESS_PLACEHOLDER,
  SECP256K1_WITNESS_LOCK_SIZE,
  getRgbppLockScript,
  getSecp256k1CellDep,
} from '../constants';
import { blockchain } from '@ckb-lumos/base';
import signWitnesses from '@nervosnetwork/ckb-sdk-core/lib/signWitnesses';
import {
  addressToScript,
  getTransactionSize,
  rawTransactionToHash,
  scriptToHash,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils';

/**
 * Generate the virtual ckb transaction for the btc transfer tx
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred, if the noMergeOutputCells is true, the transferAmount will be ignored
 * @param isMainnet True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet(see btcTestnetType for details about BTC Testnet)
 * @param noMergeOutputCells(Optional) The noMergeOutputCells indicates whether the CKB outputs need to be merged. By default, the outputs will be merged.
 * @param witnessLockPlaceholderSize(Optional) The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate(Optional) The CKB transaction fee rate, default value is 1100
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
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
  btcTestnetType,
}: BtcTransferVirtualTxParams): Promise<BtcTransferVirtualTxResult> => {
  const xudtType = blockchain.Script.unpack(xudtTypeBytes) as CKBComponents.Script;

  if (!isUDTTypeSupported(xudtType, isMainnet)) {
    throw new TypeAssetNotSupportedError('The type script asset is not supported now');
  }

  const deduplicatedLockArgsList = deduplicateList(rgbppLockArgsList);

  const rgbppLocks = deduplicatedLockArgsList.map((args) => genRgbppLockScript(args, isMainnet, btcTestnetType));
  let rgbppTargetCells: IndexerCell[] = [];
  let rgbppOtherTypeCells: IndexerCell[] = [];
  for await (const rgbppLock of rgbppLocks) {
    const cells = await collector.getCells({ lock: rgbppLock, isDataMustBeEmpty: false });

    throwErrorWhenRgbppCellsInvalid(cells, xudtTypeBytes, isMainnet);

    const targetCells = cells!.filter((cell) => isScriptEqual(cell.output.type!, xudtTypeBytes));
    const otherTypeCells = cells!.filter((cell) => !isScriptEqual(cell.output.type!, xudtTypeBytes));
    rgbppTargetCells = [...rgbppTargetCells, ...targetCells];
    rgbppOtherTypeCells = [...rgbppOtherTypeCells, ...otherTypeCells];
  }
  rgbppTargetCells = rgbppTargetCells.sort(compareInputs);
  rgbppOtherTypeCells = rgbppOtherTypeCells.sort(compareInputs);

  let inputs: CKBComponents.CellInput[] = [];
  let sumInputsCapacity = BigInt(0);
  const outputs: CKBComponents.CellOutput[] = [];
  const outputsData: Hex[] = [];
  let needPaymasterCell = false;

  // The non-target RGBPP outputs correspond to the RGBPP inputs one-to-one, and the outputs are still bound to the sender’s BTC UTXOs
  const handleNonTargetRgbppCells = (targetRgbppOutputLen: number) => {
    for (const [index, otherRgbppCell] of rgbppOtherTypeCells.entries()) {
      inputs.push({
        previousOutput: otherRgbppCell.outPoint,
        since: '0x0',
      });
      sumInputsCapacity += BigInt(otherRgbppCell.output.capacity);
      outputs.push({
        ...otherRgbppCell.output,
        // Vouts[targetRgbppOutputLen + 1], ..., Vouts[targetRgbppOutputLen + rgbppOtherTypeCells.length] for other RGBPP assets
        lock: genRgbppLockScript(buildPreLockArgs(targetRgbppOutputLen + index + 1), isMainnet, btcTestnetType),
      });
      outputsData.push(otherRgbppCell.outputData);
    }
  };

  if (noMergeOutputCells) {
    // The target RGBPP outputs correspond to the RGBPP inputs one-to-one, and the outputs are bound to the receivers' BTC UTXOs
    for (const [index, targetRgbppCell] of rgbppTargetCells.entries()) {
      inputs.push({
        previousOutput: targetRgbppCell.outPoint,
        since: '0x0',
      });
      sumInputsCapacity += BigInt(targetRgbppCell.output.capacity);
      outputs.push({
        ...targetRgbppCell.output,
        // The Vouts[0] for OP_RETURN and Vouts[1], ..., Vouts[rgbppTargetCells.length] for target RGBPP assets
        lock: genRgbppLockScript(buildPreLockArgs(index + 1), isMainnet, btcTestnetType),
      });
      outputsData.push(targetRgbppCell.outputData);
    }
    handleNonTargetRgbppCells(rgbppTargetCells.length);
  } else {
    // The target RGBPP assets are divided into two parts: transfer(bound to the receivers' BTC UTXO) and change(bound to the sender’s BTC UTXO).
    const collectResult = collector.collectUdtInputs({
      liveCells: rgbppTargetCells,
      needAmount: transferAmount,
    });
    inputs = collectResult.inputs;
    throwErrorWhenTxInputsExceeded(inputs.length);
    sumInputsCapacity = collectResult.sumInputsCapacity;

    const rgbppCellCapacity = calculateRgbppCellCapacity(xudtType);

    const needRgbppChange = collectResult.sumAmount > transferAmount;
    // To simplify, when the xUDT does not need change, all the capacity of the inputs will be given to the receiver
    const receiverOutputCapacity = needRgbppChange ? BigInt(rgbppTargetCells[0].output.capacity) : sumInputsCapacity;
    // The Vouts[0] for OP_RETURN and Vouts[1] for target transfer RGBPP assets
    outputs.push({
      lock: genRgbppLockScript(buildPreLockArgs(1), isMainnet, btcTestnetType),
      type: xudtType,
      capacity: append0x(receiverOutputCapacity.toString(16)),
    });
    outputsData.push(append0x(u128ToLe(transferAmount)));

    if (needRgbppChange) {
      const isCapacitySufficient = isRgbppCapacitySufficientForChange(sumInputsCapacity, receiverOutputCapacity);
      needPaymasterCell = !isCapacitySufficient;
      // When the capacity of inputs is enough for the outputs, the sender needs to recover the excess capacity.
      const udtChangeCapacity = isCapacitySufficient ? sumInputsCapacity - receiverOutputCapacity : rgbppCellCapacity;
      // The Vouts[2] for target change RGBPP assets
      outputs.push({
        lock: genRgbppLockScript(buildPreLockArgs(2), isMainnet, btcTestnetType),
        type: xudtType,
        capacity: append0x(udtChangeCapacity.toString(16)),
      });
      outputsData.push(append0x(u128ToLe(collectResult.sumAmount - transferAmount)));
    }

    handleNonTargetRgbppCells(outputs.length);
  }

  const isStandardUDT = isStandardUDTTypeSupported(xudtType, isMainnet);
  const cellDeps = await fetchTypeIdCellDeps(
    isMainnet,
    {
      rgbpp: true,
      xudt: isStandardUDT,
      compatibleXudtCodeHashes: isStandardUDT ? [] : [xudtType.codeHash],
    },
    btcTestnetType,
  );
  if (needPaymasterCell) {
    cellDeps.push(getSecp256k1CellDep(isMainnet));
  }
  const witnesses: Hex[] = [];
  const lockArgsSet: Set<string> = new Set();
  const allRgbppCells = rgbppTargetCells.concat(rgbppOtherTypeCells);
  for (const cell of allRgbppCells) {
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
      getTransactionSize(ckbRawTx) + (witnessLockPlaceholderSize ?? estimateWitnessSize(deduplicatedLockArgsList));
    const estimatedTxFee = calculateTransactionFee(txSize, ckbFeeRate);

    const changeCapacity = BigInt(outputs[outputs.length - 1].capacity) - estimatedTxFee;
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
 * @param isMainnet True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet(see btcTestnetType for details about BTC Testnet)
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const genBtcBatchTransferCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  rgbppReceivers,
  isMainnet,
  btcTestnetType,
}: BtcBatchTransferVirtualTxParams): Promise<BtcBatchTransferVirtualTxResult> => {
  const xudtType = blockchain.Script.unpack(xudtTypeBytes) as CKBComponents.Script;

  if (!isUDTTypeSupported(xudtType, isMainnet)) {
    throw new TypeAssetNotSupportedError('The type script asset is not supported now');
  }

  const rgbppLocks = rgbppLockArgsList.map((args) => genRgbppLockScript(args, isMainnet, btcTestnetType));
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
    lock: genRgbppLockScript(buildPreLockArgs(index + 1), isMainnet, btcTestnetType),
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
    rgbppChangeOutIndex = rgbppReceivers.length + 1;
    outputs.push({
      // The Vouts[0] for OP_RETURN and Vouts[rgbppChangeOutIndex] for RGBPP change assets
      lock: genRgbppLockScript(buildPreLockArgs(rgbppChangeOutIndex), isMainnet, btcTestnetType),
      type: xudtType,
      capacity: append0x(rpbppCellCapacity.toString(16)),
    });
    outputsData.push(append0x(u128ToLe(sumAmount - sumTransferAmount)));
  }

  const isStandardUDT = isStandardUDTTypeSupported(xudtType, isMainnet);
  let cellDeps = await fetchTypeIdCellDeps(
    isMainnet,
    {
      rgbpp: true,
      xudt: isStandardUDT,
      compatibleXudtCodeHashes: isStandardUDT ? [] : [xudtType.codeHash],
    },
    btcTestnetType,
  );
  cellDeps = [...cellDeps, getSecp256k1CellDep(isMainnet)];

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
 * @param isMainnet True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet
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
  const rawTx = ckbRawTx as CKBComponents.RawTransactionToSign;

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
  const txFee = MAX_FEE;
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

  const keyMap = new Map<string, string>();
  keyMap.set(scriptToHash(issuerLock), secp256k1PrivateKey);

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
