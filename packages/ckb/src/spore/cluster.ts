import { packRawClusterData } from '@spore-sdk/core';
import { RgbppCkbVirtualTx } from '../types/rgbpp';
import {
  append0x,
  calculateTransactionFee,
  fetchTypeIdCellDeps,
  buildPreLockArgs,
  calculateCommitment,
  genRgbppLockScript,
  generateClusterCreateCoBuild,
  generateClusterId,
} from '../utils';
import { CreateClusterCkbVirtualTxParams, Hex, SporeVirtualTxResult } from '../types';
import {
  RGBPP_TX_WITNESS_MAX_SIZE,
  RGBPP_WITNESS_PLACEHOLDER,
  getClusterTypeDep,
  getClusterTypeScript,
} from '../constants';
import { NoRgbppLiveCellError } from '../error';
import { bytesToHex, getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';

/**
 * Generate the virtual ckb transaction for creating cluster
 * @param collector The collector that collects CKB live cells and transactions
 * @param rgbppLockArgs The rgbpp assets cell lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param clusterData The cluster's data, including name and description.
 * @param isMainnet True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet(see btcTestnetType for details about BTC Testnet)
 * @param witnessLockPlaceholderSize(Optional) The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate(Optional) The CKB transaction fee rate, default value is 1100
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const genCreateClusterCkbVirtualTx = async ({
  collector,
  rgbppLockArgs,
  clusterData,
  isMainnet,
  witnessLockPlaceholderSize,
  ckbFeeRate,
  btcTestnetType,
  vendorCellDeps,
}: CreateClusterCkbVirtualTxParams): Promise<SporeVirtualTxResult> => {
  const rgbppLock = genRgbppLockScript(rgbppLockArgs, isMainnet, btcTestnetType);
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
      lock: genRgbppLockScript(buildPreLockArgs(1), isMainnet, btcTestnetType),
      type: {
        ...getClusterTypeScript(isMainnet),
        args: clusterId,
      },
    },
  ];
  const outputsData: Hex[] = [bytesToHex(packRawClusterData(clusterData))];
  const cellDeps = [
    ...(await fetchTypeIdCellDeps(isMainnet, { rgbpp: true }, btcTestnetType, vendorCellDeps)),
    getClusterTypeDep(isMainnet),
  ];
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
    needPaymasterCell: false,
  };
};
