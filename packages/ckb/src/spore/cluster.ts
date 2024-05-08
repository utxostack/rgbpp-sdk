import { RgbppCkbVirtualTx } from '../types/rgbpp';
import { packRawClusterData } from '@spore-sdk/core';
import { append0x, calculateTransactionFee } from '../utils';
import { buildPreLockArgs, calculateCommitment, genRgbppLockScript } from '../utils/rgbpp';
import { CreateClusterCkbVirtualTxParams, Hex, SporeVirtualTxResult } from '../types';
import {
  RGBPP_TX_WITNESS_MAX_SIZE,
  RGBPP_WITNESS_PLACEHOLDER,
  getClusterTypeDep,
  getClusterTypeScript,
  getRgbppLockConfigDep,
  getRgbppLockDep,
  getRgbppLockScript,
} from '../constants';
import { generateClusterCreateCoBuild, generateClusterId } from '../utils/spore';
import { NoRgbppLiveCellError } from '../error';
import { bytesToHex, getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';

/**
 * Generate the virtual ckb transaction for creating cluster
 * @param collector The collector that collects CKB live cells and transactions
 * @param rgbppLockArgs The rgbpp assets cell lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param clusterData The cluster's data, including name and description.
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genCreateClusterCkbVirtualTx = async ({
  collector,
  rgbppLockArgs,
  clusterData,
  isMainnet,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: CreateClusterCkbVirtualTxParams): Promise<SporeVirtualTxResult> => {
  const rgbppLock = {
    ...getRgbppLockScript(isMainnet),
    args: append0x(rgbppLockArgs),
  };
  const rgbppCells = await collector.getCells({ lock: rgbppLock });
  if (!rgbppCells || rgbppCells.length === 0) {
    throw new NoRgbppLiveCellError('No rgbpp cells found with the rgbpp lock args');
  }
  const rgbppCell = rgbppCells[0];

  const inputs: CKBComponents.CellInput[] = [
    {
      previousOutput: rgbppCell.outPoint,
      since: '0x0',
    },
  ];

  const clusterId = generateClusterId(inputs[0], 0);
  const outputs: CKBComponents.CellOutput[] = [
    {
      ...rgbppCell.output,
      // The BTC transaction Vouts[0] for OP_RETURN, Vouts[1] for cluster
      lock: genRgbppLockScript(buildPreLockArgs(1), isMainnet),
      type: {
        ...getClusterTypeScript(isMainnet),
        args: clusterId,
      },
    },
  ];
  const outputsData: Hex[] = [bytesToHex(packRawClusterData(clusterData))];
  const cellDeps = [getRgbppLockDep(isMainnet), getRgbppLockConfigDep(isMainnet), getClusterTypeDep(isMainnet)];
  const sporeCoBuild = generateClusterCreateCoBuild(outputs[0], outputsData[0]);
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

  let changeCapacity = BigInt(rgbppCell.output.capacity);
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
    clusterId,
  };
};
