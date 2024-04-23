import { RgbppCkbVirtualTx } from '../types/rgbpp';
import { packRawSporeData } from '@spore-sdk/core';
import {
  append0x,
  calculateRgbppSporeCellCapacity,
  calculateTransactionFee,
  isClusterSporeTypeSupported,
} from '../utils';
import { buildPreLockArgs, calculateCommitment, genRgbppLockScript } from '../utils/rgbpp';
import {
  AppendIssuerCellToSporeCreate,
  CreateSporeCkbVirtualTxParams,
  Hex,
  SporeCreateVirtualTxResult,
  SporeTransferVirtualTxResult,
  TransferSporeCkbVirtualTxParams,
} from '../types';
import {
  MAX_FEE,
  MIN_CAPACITY,
  RGBPP_TX_WITNESS_MAX_SIZE,
  RGBPP_WITNESS_PLACEHOLDER,
  SECP256K1_WITNESS_LOCK_SIZE,
  getClusterTypeDep,
  getRgbppLockConfigDep,
  getRgbppLockDep,
  getRgbppLockScript,
  getSecp256k1CellDep,
  getSporeTypeDep,
  getSporeTypeScript,
} from '../constants';
import { generateSporeCreateCoBuild, generateSporeId, generateSporeTransferCoBuild } from '../utils/spore';
import {
  NoLiveCellError,
  NoRgbppLiveCellError,
  RgbppUtxoBindMultiSporesError,
  TypeAssetNotSupportedError,
} from '../error';
import {
  addressToScript,
  bytesToHex,
  getTransactionSize,
  rawTransactionToHash,
  scriptToHash,
  serializeScript,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils';
import signWitnesses from '@nervosnetwork/ckb-sdk-core/lib/signWitnesses';

/**
 * Generate the virtual ckb transaction for creating spores
 * @param collector The collector that collects CKB live cells and transactions
 * @param clusterRgbppLockArgs The cluster rgbpp cell lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param sporeDataList The spore's data list, including name and description.
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genCreateSporeCkbVirtualTx = async ({
  collector,
  clusterRgbppLockArgs,
  sporeDataList,
  isMainnet,
}: CreateSporeCkbVirtualTxParams): Promise<SporeCreateVirtualTxResult> => {
  const clusterRgbppLock = {
    ...getRgbppLockScript(isMainnet),
    args: append0x(clusterRgbppLockArgs),
  };
  const clusterCells = await collector.getCells({ lock: clusterRgbppLock, isDataEmpty: false });
  if (!clusterCells || clusterCells.length === 0) {
    throw new NoRgbppLiveCellError('No cluster rgbpp cells found with the cluster rgbpp lock args');
  }
  if (clusterCells.length > 1) {
    throw new RgbppUtxoBindMultiSporesError('The UTXO is bound to multiple clusters');
  }
  const clusterCell = clusterCells[0];

  if (!clusterCell.output.type || !isClusterSporeTypeSupported(clusterCell.output.type, isMainnet)) {
    throw new TypeAssetNotSupportedError('The type script asset is not supported now');
  }

  const sumInputsCapacity = clusterCell.output.capacity;

  const inputs: CKBComponents.CellInput[] = [
    {
      previousOutput: clusterCell.outPoint,
      since: '0x0',
    },
  ];

  const clusterCellDep: CKBComponents.CellDep = {
    outPoint: clusterCell.outPoint,
    depType: 'code',
  };

  const sporeOutputs = sporeDataList.map((data, index) => ({
    // The BTC transaction Vouts[0] for OP_RETURN, Vouts[1] for cluster and Vouts[2]... for spore
    lock: genRgbppLockScript(buildPreLockArgs(index + 2), isMainnet),
    type: {
      ...getSporeTypeScript(isMainnet),
      // The CKB transaction outputs[0] fro cluster and outputs[1]... for spore
      args: generateSporeId(inputs[0], index + 1),
    },
    capacity: append0x(calculateRgbppSporeCellCapacity(data).toString(16)),
  }));
  const sporeOutputsData = sporeDataList.map((data) => bytesToHex(packRawSporeData(data)));

  const outputs: CKBComponents.CellOutput[] = [
    {
      ...clusterCell.output,
      // The BTC transaction Vouts[0] for OP_RETURN, Vouts[1] for cluster
      lock: genRgbppLockScript(buildPreLockArgs(1), isMainnet),
    },
    ...sporeOutputs,
  ];
  const outputsData: Hex[] = [clusterCell.outputData, ...sporeOutputsData];
  const cellDeps = [
    getRgbppLockDep(isMainnet),
    getRgbppLockConfigDep(isMainnet),
    getClusterTypeDep(isMainnet),
    getSporeTypeDep(isMainnet),
    clusterCellDep,
  ];
  const sporeCoBuild = generateSporeCreateCoBuild({
    sporeOutputs,
    sporeOutputsData,
    clusterCell,
    clusterOutputCell: outputs[0],
  });
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

  const virtualTx: RgbppCkbVirtualTx = {
    ...ckbRawTx,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
    sumInputsCapacity,
    clusterCell,
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
export const appendIssuerCellToSporesCreate = async ({
  secp256k1PrivateKey,
  issuerAddress,
  collector,
  ckbRawTx,
  sumInputsCapacity,
  isMainnet,
  ckbFeeRate,
}: AppendIssuerCellToSporeCreate): Promise<CKBComponents.RawTransaction> => {
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

  rawTx.cellDeps = [...rawTx.cellDeps, getSecp256k1CellDep(isMainnet)];

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

  const lastRawTxWitnessIndex = rawTx.witnesses.length - 1;
  rawTx.witnesses = [
    ...rawTx.witnesses.slice(0, lastRawTxWitnessIndex),
    ...issuerWitnesses,
    // The cobuild witness will be placed to the tail of the witnesses
    rawTx.witnesses[lastRawTxWitnessIndex],
  ];

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

/**
 * Generate the virtual ckb transaction for transferring spore
 * @param collector The collector that collects CKB live cells and transactions
 * @param sporeRgbppLockArgs The spore rgbpp cell lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genTransferSporeCkbVirtualTx = async ({
  collector,
  sporeRgbppLockArgs,
  sporeTypeBytes,
  isMainnet,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: TransferSporeCkbVirtualTxParams): Promise<SporeTransferVirtualTxResult> => {
  const sporeRgbppLock = {
    ...getRgbppLockScript(isMainnet),
    args: append0x(sporeRgbppLockArgs),
  };
  const sporeCells = await collector.getCells({ lock: sporeRgbppLock, isDataEmpty: false });
  if (!sporeCells || sporeCells.length === 0) {
    throw new NoRgbppLiveCellError('No spore rgbpp cells found with the spore rgbpp lock args');
  }
  if (sporeCells.length > 1) {
    throw new RgbppUtxoBindMultiSporesError('The UTXO is bound to multiple spores');
  }
  const sporeCell = sporeCells[0];

  if (!sporeCell.output.type) {
    throw new RgbppUtxoBindMultiSporesError('The cell with the rgbpp lock args has no spore asset');
  }

  if (append0x(serializeScript(sporeCell.output.type)) !== append0x(sporeTypeBytes)) {
    throw new RgbppUtxoBindMultiSporesError('The cell type with the rgbpp lock args does not match');
  }

  const inputs: CKBComponents.CellInput[] = [
    {
      previousOutput: sporeCell.outPoint,
      since: '0x0',
    },
  ];

  const outputs: CKBComponents.CellOutput[] = [
    {
      ...sporeCell.output,
      // The BTC transaction Vouts[0] for OP_RETURN, Vouts[1] for spore
      lock: genRgbppLockScript(buildPreLockArgs(1), isMainnet),
    },
  ];
  const outputsData: Hex[] = [sporeCell.outputData];
  const cellDeps = [getRgbppLockDep(isMainnet), getRgbppLockConfigDep(isMainnet), getSporeTypeDep(isMainnet)];
  const sporeCoBuild = generateSporeTransferCoBuild(sporeCell, outputs[0]);
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
