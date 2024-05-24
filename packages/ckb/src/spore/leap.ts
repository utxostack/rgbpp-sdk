import { BtcTimeCellsParams, RgbppCkbVirtualTx } from '../types/rgbpp';
import { append0x, calculateTransactionFee } from '../utils';
import {
  btcTxIdFromBtcTimeLockArgs,
  buildSpvClientCellDep,
  calculateCommitment,
  compareInputs,
  genBtcTimeLockScript,
  lockScriptFromBtcTimeLockArgs,
  transformSpvProof,
} from '../utils/rgbpp';
import {
  Hex,
  LeapSporeFromBtcToCkbVirtualTxParams,
  LeapSporeFromCkbToBtcVirtualTxParams,
  SporeLeapVirtualTxResult,
} from '../types';
import {
  BTC_JUMP_CONFIRMATION_BLOCKS,
  RGBPP_TX_WITNESS_MAX_SIZE,
  RGBPP_WITNESS_PLACEHOLDER,
  getBtcTimeLockConfigDep,
  getBtcTimeLockDep,
  getRgbppLockScript,
  getSporeTypeDep,
} from '../constants';
import { generateSporeTransferCoBuild, throwErrorWhenSporeCellsInvalid } from '../utils/spore';
import { NoRgbppLiveCellError } from '../error';
import {
  addressToScript,
  getTransactionSize,
  serializeOutPoint,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils';
import { blockchain } from '@ckb-lumos/base';
import { buildBtcTimeUnlockWitness } from '../rgbpp';

/**
 * Generate the virtual ckb transaction for leaping spore from BTC to CKB
 * @param collector The collector that collects CKB live cells and transactions
 * @param sporeRgbppLockArgs The spore rgbpp cell lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param sporeTypeBytes The spore type script serialized bytes
 * @param toCkbAddress The receiver ckb address
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genLeapSporeFromBtcToCkbVirtualTx = async ({
  collector,
  sporeRgbppLockArgs,
  sporeTypeBytes,
  toCkbAddress,
  isMainnet,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: LeapSporeFromBtcToCkbVirtualTxParams): Promise<SporeLeapVirtualTxResult> => {
  const sporeRgbppLock = {
    ...getRgbppLockScript(isMainnet),
    args: append0x(sporeRgbppLockArgs),
  };
  const sporeCells = await collector.getCells({ lock: sporeRgbppLock, isDataMustBeEmpty: false });

  throwErrorWhenSporeCellsInvalid(sporeCells, sporeTypeBytes, isMainnet);

  const sporeCell = sporeCells![0];

  const inputs: CKBComponents.CellInput[] = [
    {
      previousOutput: sporeCell.outPoint,
      since: '0x0',
    },
  ];

  const toLock = addressToScript(toCkbAddress);
  const outputs: CKBComponents.CellOutput[] = [
    {
      ...sporeCell.output,
      lock: genBtcTimeLockScript(toLock, isMainnet),
    },
  ];
  const outputsData: Hex[] = [sporeCell.outputData];
  const cellDeps = [...(await fetchRgbppAndConfigCellDeps(isMainnet)), getSporeTypeDep(isMainnet)];
  const sporeCoBuild = generateSporeTransferCoBuild([sporeCell], outputs);
  const witnesses = [RGBPP_WITNESS_PLACEHOLDER, sporeCoBuild];

  const ckbRawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  let changeCapacity = BigInt(sporeCell.output.capacity);
  const txSize = getTransactionSize(ckbRawTx) + (witnessLockPlaceholderSize ?? RGBPP_TX_WITNESS_MAX_SIZE);
  const estimatedTxFee = calculateTransactionFee(txSize, ckbFeeRate);
  changeCapacity -= estimatedTxFee;

  ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  const virtualTx: RgbppCkbVirtualTx = {
    ...ckbRawTx,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
    sporeCell,
    needPaymasterCell: false,
    sumInputsCapacity: sporeCell.output.capacity,
  };
};

/**
 * Collect btc time cells and spend them to create spore cells for the specific lock scripts in the btc time lock args
 * The btc time lock args data structure is: lock_script | after | new_bitcoin_tx_id
 * @param btcTimeCells The BTC time cells of spore
 * @param btcAssetsApi BTC Assets Api
 * @param isMainnet
 */
export const buildSporeBtcTimeCellsSpentTx = async ({
  btcTimeCells,
  btcAssetsApi,
  isMainnet,
}: BtcTimeCellsParams): Promise<CKBComponents.RawTransaction> => {
  const sortedBtcTimeCells = btcTimeCells.sort(compareInputs);
  const inputs: CKBComponents.CellInput[] = sortedBtcTimeCells.map((cell) => ({
    previousOutput: cell.outPoint,
    since: '0x0',
  }));

  const outputs: CKBComponents.CellOutput[] = sortedBtcTimeCells.map((cell) => ({
    lock: lockScriptFromBtcTimeLockArgs(cell.output.lock.args),
    type: cell.output.type,
    capacity: cell.output.capacity,
  }));

  const outputsData = sortedBtcTimeCells.map((cell) => cell.outputData);

  const cellDeps: CKBComponents.CellDep[] = [
    getBtcTimeLockDep(isMainnet),
    getSporeTypeDep(isMainnet),
    getBtcTimeLockConfigDep(isMainnet),
  ];

  const witnesses: Hex[] = [];

  const lockArgsSet: Set<string> = new Set();
  const cellDepsSet: Set<string> = new Set();
  for await (const btcTimeCell of sortedBtcTimeCells) {
    if (lockArgsSet.has(btcTimeCell.output.lock.args)) {
      witnesses.push('0x');
      continue;
    }
    lockArgsSet.add(btcTimeCell.output.lock.args);
    const result = await btcAssetsApi.getRgbppSpvProof(
      btcTxIdFromBtcTimeLockArgs(btcTimeCell.output.lock.args),
      BTC_JUMP_CONFIRMATION_BLOCKS,
    );
    const { spvClient, proof } = transformSpvProof(result);

    if (!cellDepsSet.has(serializeOutPoint(spvClient))) {
      cellDeps.push(buildSpvClientCellDep(spvClient));
      cellDepsSet.add(serializeOutPoint(spvClient));
    }

    const btcTimeWitness = append0x(
      serializeWitnessArgs({ lock: buildBtcTimeUnlockWitness(proof), inputType: '', outputType: '' }),
    );
    witnesses.push(btcTimeWitness);
  }

  const sporeCoBuild = generateSporeTransferCoBuild(sortedBtcTimeCells, outputs);
  witnesses.push(sporeCoBuild);

  const ckbTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  return ckbTx;
};

/**
 * Generate the virtual ckb transaction for leaping spore from CKB to BTC
 * @param collector The collector that collects CKB live cells and transactions
 * @param sporeRgbppLockArgs The spore rgbpp cell lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param sporeTypeBytes The spore type script serialized bytes
 * @param toCkbAddress The receiver ckb address
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genLeapSporeFromCkbToBtcRawTx = async ({
  collector,
  sporeTypeBytes,
  fromCkbAddress,
  toRgbppLockArgs,
  isMainnet,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: LeapSporeFromCkbToBtcVirtualTxParams): Promise<CKBComponents.RawTransaction> => {
  const fromLock = addressToScript(fromCkbAddress);
  const sporeType = blockchain.Script.unpack(sporeTypeBytes) as CKBComponents.Script;
  const sporeCells = await collector.getCells({ lock: fromLock, type: sporeType });
  if (!sporeCells || sporeCells.length === 0) {
    throw new NoRgbppLiveCellError('No spore rgbpp cells found with the spore rgbpp lock args and spore type script');
  }
  const sporeCell = sporeCells[0];

  const inputs: CKBComponents.CellInput[] = [
    {
      previousOutput: sporeCell.outPoint,
      since: '0x0',
    },
  ];

  const outputs: CKBComponents.CellOutput[] = [
    {
      ...sporeCell.output,
      lock: {
        ...getRgbppLockScript(isMainnet),
        args: append0x(toRgbppLockArgs),
      },
    },
  ];
  const outputsData: Hex[] = [sporeCell.outputData];
  const cellDeps = [...(await fetchRgbppAndConfigCellDeps(isMainnet)), getSporeTypeDep(isMainnet)];
  const sporeCoBuild = generateSporeTransferCoBuild([sporeCell], outputs);
  const witnesses = [RGBPP_WITNESS_PLACEHOLDER, sporeCoBuild];

  const ckbRawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  let changeCapacity = BigInt(sporeCell.output.capacity);
  const txSize = getTransactionSize(ckbRawTx) + (witnessLockPlaceholderSize ?? RGBPP_TX_WITNESS_MAX_SIZE);
  const estimatedTxFee = calculateTransactionFee(txSize, ckbFeeRate);
  changeCapacity -= estimatedTxFee;

  ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  return ckbRawTx;
};
