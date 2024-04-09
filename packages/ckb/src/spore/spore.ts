import { RgbppCkbVirtualTx } from '../types/rgbpp';
import { createSpore, transferSpore } from '@spore-sdk/core';
import { append0x, calculateTransactionFee } from '../utils';
import { calculateCommitment } from '../utils/rgbpp';
import { CreateSporeCkbVirtualTxParams, SporeVirtualTxResult, TransferSporeCkbVirtualTxParams } from '../types';
import { RGBPP_TX_WITNESS_MAX_SIZE } from '../constants';
import { ckbTxFromTxSkeleton } from '../utils/spore';

/**
 * Generate the virtual ckb transaction for creating spore
 * @param sporeParams The sporeParams is the same as the createSpore function of the spore-sdk
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 3000 (It can make most scenarios work properly)
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genCreateSporeCkbVirtualTx = async ({
  sporeParams,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: CreateSporeCkbVirtualTxParams): Promise<SporeVirtualTxResult> => {
  const { txSkeleton } = await createSpore(sporeParams);
  const ckbRawTx = ckbTxFromTxSkeleton(txSkeleton);

  let changeCapacity = BigInt(ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity);
  const increasedTxFee = calculateTransactionFee(witnessLockPlaceholderSize ?? RGBPP_TX_WITNESS_MAX_SIZE, ckbFeeRate);
  changeCapacity -= increasedTxFee;

  ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  const virtualTx: RgbppCkbVirtualTx = {
    ...ckbRawTx,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
  };
};

/**
 * Generate the virtual ckb transaction for transferring spore
 * @param sporeParams The sporeParams is the same as the createSpore function of the spore-sdk
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 3000 (It can make most scenarios work properly)
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genTransferSporeCkbVirtualTx = async ({
  sporeParams,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: TransferSporeCkbVirtualTxParams): Promise<SporeVirtualTxResult> => {
  const { txSkeleton } = await transferSpore(sporeParams);
  const ckbRawTx = ckbTxFromTxSkeleton(txSkeleton);

  let changeCapacity = BigInt(ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity);
  const increasedTxFee = calculateTransactionFee(witnessLockPlaceholderSize ?? RGBPP_TX_WITNESS_MAX_SIZE, ckbFeeRate);
  changeCapacity -= increasedTxFee;

  ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  const virtualTx: RgbppCkbVirtualTx = {
    ...ckbRawTx,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
  };
};
