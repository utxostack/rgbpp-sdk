import { BtcTransferVirtualTxParams, BtcTransferVirtualTxResult, RgbppCkbVirtualTx } from '../types/rgbpp';
import { createCluster } from '@spore-sdk/core';
import { blockchain } from '@ckb-lumos/base';
import {
  InputsCapacityNotEnoughError,
  NoLiveCellError,
  NoRgbppLiveCellError,
  TypeAssetNotSupportedError,
} from '../error';
import {
  append0x,
  calculateRgbppCellCapacity,
  calculateTransactionFee,
  isTypeAssetSupported,
  u128ToLe,
} from '../utils';
import {
  buildPreLockArgs,
  calculateCommitment,
  compareInputs,
  estimateWitnessSize,
  genRgbppLockScript,
} from '../utils/rgbpp';
import { Hex, IndexerCell, CreateClusterCkbVirtualTxParams, SporeVirtualTxResult } from '../types';
import {
  MAX_FEE,
  MIN_CAPACITY,
  RGBPP_TX_WITNESS_MAX_SIZE,
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
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param clusterParams The clusterParams is the same as the createCluster function of the spore-sdk
 * @param isMainnet
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 3000 (It can make most scenarios work properly)
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genCreateClusterCkbVirtualTx = async ({
  collector,
  rgbppLockArgsList,
  clusterParams,
  isMainnet,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: CreateClusterCkbVirtualTxParams): Promise<SporeVirtualTxResult> => {
  const { txSkeleton } = await createCluster(clusterParams);

  const rgbppLocks = rgbppLockArgsList.map((args) => genRgbppLockScript(args, isMainnet));
  let rgbppCells: IndexerCell[] = [];
  for await (const rgbppLock of rgbppLocks) {
    const cells = await collector.getCells({ lock: rgbppLock });
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
