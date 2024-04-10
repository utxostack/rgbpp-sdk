import { RgbppCkbVirtualTx } from '../types/rgbpp';
import { createCluster } from '@spore-sdk/core';
import { append0x, calculateTransactionFee } from '../utils';
import { calculateCommitment } from '../utils/rgbpp';
import { CreateClusterCkbVirtualTxParams, SporeVirtualTxResult } from '../types';
import { RGBPP_TX_WITNESS_MAX_SIZE, RGBPP_WITNESS_PLACEHOLDER } from '../constants';
import { ckbTxFromTxSkeleton } from '../utils/spore';

/**
 * Generate the virtual ckb transaction for creating cluster
 * @param clusterParams The clusterParams is the same as the createCluster function of the spore-sdk
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 3000 (It can make most scenarios work properly)
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genCreateClusterCkbVirtualTx = async ({
  clusterParams,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: CreateClusterCkbVirtualTxParams): Promise<SporeVirtualTxResult> => {
  const { txSkeleton, outputIndex } = await createCluster(clusterParams);

  const clusterCell = txSkeleton.get('outputs').get(outputIndex);
  const clusterId = clusterCell?.cellOutput.type?.args;

  const ckbRawTx = ckbTxFromTxSkeleton(txSkeleton);

  let changeCapacity = BigInt(ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity);
  const increasedTxFee = calculateTransactionFee(witnessLockPlaceholderSize ?? RGBPP_TX_WITNESS_MAX_SIZE, ckbFeeRate);
  changeCapacity -= increasedTxFee;

  ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  ckbRawTx.witnesses[0] = RGBPP_WITNESS_PLACEHOLDER;

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
