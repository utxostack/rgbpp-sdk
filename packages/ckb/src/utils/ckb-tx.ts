import { calculateTransactionFee as calculateTxFee } from '@nervosnetwork/ckb-sdk-utils/lib/calculateTransactionFee';
import { RawClusterData, packRawClusterData, SporeDataProps, packRawSporeData } from '@spore-sdk/core';
import { remove0x, u64ToLe } from './hex';
import {
  CKB_UNIT,
  UNLOCKABLE_LOCK_SCRIPT,
  getClusterTypeScript,
  getSporeTypeScript,
  getXudtTypeScript,
} from '../constants';
import { Hex, RgbppTokenInfo } from '../types';
import { PERSONAL, blake2b, hexToBytes, serializeInput, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { encodeRgbppTokenInfo, genBtcTimeLockScript } from './rgbpp';

export const calculateTransactionFee = (txSize: number, feeRate?: bigint): bigint => {
  const rate = feeRate ?? BigInt(1100);
  const fee = calculateTxFee(BigInt(txSize), rate);
  return BigInt(fee);
};

export const isUDTTypeSupported = (type: CKBComponents.Script, isMainnet: boolean): boolean => {
  const xudtType = serializeScript(getXudtTypeScript(isMainnet));
  const typeAsset = serializeScript({
    ...type,
    args: '',
  });
  return xudtType === typeAsset;
};

export const isClusterSporeTypeSupported = (type: CKBComponents.Script, isMainnet: boolean): boolean => {
  const sporeType = serializeScript(getSporeTypeScript(isMainnet));
  const typeAsset = serializeScript({
    ...type,
    args: '',
  });
  const clusterType = serializeScript(getClusterTypeScript(isMainnet));
  return sporeType === typeAsset || clusterType === typeAsset;
};

export const isTypeAssetSupported = (type: CKBComponents.Script, isMainnet: boolean): boolean => {
  return isUDTTypeSupported(type, isMainnet) || isClusterSporeTypeSupported(type, isMainnet);
};

// The BTC_TIME_CELL_INCREASED_SIZE is related to the specific lock script.
// We assume that the maximum length of lock script args is 26 bytes. If it exceeds, an error will be thrown.
const LOCK_ARGS_HEX_MAX_SIZE = 26 * 2;
export const isLockArgsSizeExceeded = (args: Hex) => remove0x(args).length > LOCK_ARGS_HEX_MAX_SIZE;

const BTC_TIME_CELL_INCREASED_SIZE = 95;

// For simplicity, we keep the capacity of the RGBPP cell the same as the BTC time cell
// minimum occupied capacity and 1 ckb for transaction fee and assume UDT cell data size is 16bytes
/**
 * RGB_lock:
    code_hash: 
      RGB_lock
    args:
      out_index | bitcoin_tx_id
 */
const RGBPP_LOCK_SIZE = 32 + 1 + 36;
export const calculateRgbppCellCapacity = (xudtType?: CKBComponents.Script): bigint => {
  const typeArgsSize = xudtType ? remove0x(xudtType.args).length / 2 : 32;
  const udtTypeSize = 33 + typeArgsSize;
  const cellSize = RGBPP_LOCK_SIZE + udtTypeSize + 8 + 16 + BTC_TIME_CELL_INCREASED_SIZE;
  return BigInt(cellSize + 1) * CKB_UNIT;
};

// Minimum occupied capacity and 1 ckb for transaction fee
// Assume UDT cell data size is 16bytes
// The default length of xut type args is 32 bytes
const DEFAULT_UDT_ARGS_SIZE = 32;
export const calculateUdtCellCapacity = (lock: CKBComponents.Script, udtType?: CKBComponents.Script): bigint => {
  const lockArgsSize = remove0x(lock.args).length / 2;
  const typeArgsSize = udtType ? remove0x(udtType.args).length / 2 : DEFAULT_UDT_ARGS_SIZE;
  const cellSize = 33 + lockArgsSize + 33 + typeArgsSize + 8 + 16;
  return BigInt(cellSize + 1) * CKB_UNIT;
};

// Unique Type Script: https://github.com/ckb-cell/unique-cell?tab=readme-ov-file#unique-type-script
export const calculateXudtTokenInfoCellCapacity = (tokenInfo: RgbppTokenInfo, lock: CKBComponents.Script): bigint => {
  const lockSize = remove0x(lock.args).length / 2 + 33;
  const cellDataSize = remove0x(encodeRgbppTokenInfo(tokenInfo)).length / 2;
  const uniqueTypeSize = 32 + 1 + 20;
  const cellSize = lockSize + uniqueTypeSize + 8 + cellDataSize;
  return BigInt(cellSize) * CKB_UNIT;
};

// Unique Type Script: https://github.com/ckb-cell/unique-cell?tab=readme-ov-file#unique-type-script
export const calculateRgbppTokenInfoCellCapacity = (tokenInfo: RgbppTokenInfo, isMainnet: boolean): bigint => {
  const btcTimeLock = genBtcTimeLockScript(UNLOCKABLE_LOCK_SCRIPT, isMainnet);
  const lockSize = remove0x(btcTimeLock.args).length / 2 + 33;
  const cellDataSize = remove0x(encodeRgbppTokenInfo(tokenInfo)).length / 2;
  const typeSize = 32 + 1 + 20;
  const cellSize = lockSize + typeSize + 8 + cellDataSize;
  return BigInt(cellSize) * CKB_UNIT;
};

// Generate type id for Unique type script args
export const generateUniqueTypeArgs = (firstInput: CKBComponents.CellInput, firstOutputIndex: number) => {
  const input = hexToBytes(serializeInput(firstInput));
  const s = blake2b(32, null, null, PERSONAL);
  s.update(input);
  s.update(hexToBytes(`0x${u64ToLe(BigInt(firstOutputIndex))}`));
  return `0x${s.digest('hex').slice(0, 40)}`;
};

// https://docs.spore.pro/recipes/Create/create-private-cluster
// Minimum occupied capacity and 1 ckb for transaction fee
export const calculateRgbppClusterCellCapacity = (clusterData: RawClusterData): bigint => {
  const clusterDataSize = packRawClusterData(clusterData).length;
  const clusterTypeSize = 32 + 1 + 32;
  const cellSize = RGBPP_LOCK_SIZE + clusterTypeSize + 8 + clusterDataSize;
  return BigInt(cellSize + 1) * CKB_UNIT;
};

// https://docs.spore.pro/recipes/Create/create-clustered-spore
// For simplicity, we keep the capacity of the RGBPP cell the same as the BTC time cell
// minimum occupied capacity and 1 ckb for transaction fee
/**
 * rgbpp_spore_cell:
    lock: rgbpp_lock
    type: spore_type
    data: sporeData
 */
export const calculateRgbppSporeCellCapacity = (sporeData: SporeDataProps): bigint => {
  const sporeDataSize = packRawSporeData(sporeData).length;
  const sporeTypeSize = 32 + 1 + 32;
  const cellSize = RGBPP_LOCK_SIZE + sporeTypeSize + 8 + sporeDataSize + BTC_TIME_CELL_INCREASED_SIZE;
  return BigInt(cellSize + 1) * CKB_UNIT;
};

export const deduplicateList = (rgbppLockArgsList: Hex[]): Hex[] => {
  return Array.from(new Set(rgbppLockArgsList));
};
