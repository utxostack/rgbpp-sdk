import { RgbppCkbVirtualTx, BtcJumpCkbVirtualTxParams, BtcJumpCkbVirtualTxResult } from '../types/rgbpp';
import { blockchain } from '@ckb-lumos/base';
import { TypeAssetNotSupportedError } from '../error';
import {
  append0x,
  calculateRgbppCellCapacity,
  calculateTransactionFee,
  deduplicateList,
  fetchTypeIdCellDeps,
  isLockArgsSizeExceeded,
  isScriptEqual,
  isUDTTypeSupported,
  u128ToLe,
} from '../utils';
import {
  buildPreLockArgs,
  calculateCommitment,
  throwErrorWhenTxInputsExceeded,
  compareInputs,
  estimateWitnessSize,
  genBtcTimeLockScript,
  genRgbppLockScript,
  throwErrorWhenRgbppCellsInvalid,
  isRgbppCapacitySufficientForChange,
} from '../utils/rgbpp';
import { Hex, IndexerCell } from '../types';
import { RGBPP_WITNESS_PLACEHOLDER, getSecp256k1CellDep } from '../constants';
import * as ckbUtils from '@nervosnetwork/ckb-sdk-utils';

const { addressToScript, getTransactionSize } = ckbUtils;

/**
 * Generate the virtual ckb transaction for the jumping tx from BTC to CKB
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred
 * @param toCkbAddress The receiver ckb address
 * @param witnessLockPlaceholderSize(Optional) The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate(Optional) The CKB transaction fee rate, default value is 1100
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const genBtcJumpCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  transferAmount,
  toCkbAddress,
  witnessLockPlaceholderSize,
  ckbFeeRate,
  btcTestnetType,
}: BtcJumpCkbVirtualTxParams): Promise<BtcJumpCkbVirtualTxResult> => {
  const isMainnet = toCkbAddress.startsWith('ckb');
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

  const {
    inputs,
    sumInputsCapacity: sumUdtCapacity,
    sumAmount,
  } = collector.collectUdtInputs({
    liveCells: rgbppTargetCells,
    needAmount: transferAmount,
  });
  let sumInputsCapacity = sumUdtCapacity;

  throwErrorWhenTxInputsExceeded(inputs.length);

  const rgbppCellCapacity = calculateRgbppCellCapacity(xudtType);

  const toLock = addressToScript(toCkbAddress);
  if (isLockArgsSizeExceeded(toLock.args)) {
    throw new Error('The lock script size of the to ckb address is too large');
  }

  let needPaymasterCell = false;
  const needRgbppChange = sumAmount > transferAmount;
  // To simplify, when the xUDT does not need change, all the capacity of the inputs will be given to the receiver
  const receiverOutputCapacity = needRgbppChange ? BigInt(rgbppTargetCells[0].output.capacity) : sumInputsCapacity;
  // The BTC time cell does not need to be bound to the BTC UTXO
  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: genBtcTimeLockScript(toLock, isMainnet, btcTestnetType),
      type: xudtType,
      capacity: append0x(receiverOutputCapacity.toString(16)),
    },
  ];
  const outputsData = [append0x(u128ToLe(transferAmount))];

  if (needRgbppChange) {
    const isCapacitySufficient = isRgbppCapacitySufficientForChange(sumInputsCapacity, receiverOutputCapacity);
    needPaymasterCell = !isCapacitySufficient;
    // When the capacity of inputs is enough for the outputs, the sender needs to recover the excess capacity.
    const udtChangeCapacity = isCapacitySufficient ? sumInputsCapacity - receiverOutputCapacity : rgbppCellCapacity;
    outputs.push({
      // The Vouts[0] for OP_RETURN and Vouts[1] for RGBPP assets, BTC time cells don't need btc tx out_index
      lock: genRgbppLockScript(buildPreLockArgs(1), isMainnet, btcTestnetType),
      type: xudtType,
      capacity: append0x(udtChangeCapacity.toString(16)),
    });
    outputsData.push(append0x(u128ToLe(sumAmount - transferAmount)));
  }

  const targetRgbppOutputLen = outputs.length;
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

  const cellDeps = await fetchTypeIdCellDeps(isMainnet, { rgbpp: true, xudt: true }, btcTestnetType);
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
