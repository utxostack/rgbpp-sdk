import axios from 'axios';
import { getBtcTimeLockDep, getRgbppLockDep, getUniqueTypeDep, getXudtDep } from '../constants';

interface CellDepsObject {
  rgbpp: {
    mainnet: CKBComponents.CellDep;
    testnet: CKBComponents.CellDep;
  };
  btcTime: {
    mainnet: CKBComponents.CellDep;
    testnet: CKBComponents.CellDep;
  };
  xudt: {
    testnet: CKBComponents.CellDep;
  };
  unique: {
    testnet: CKBComponents.CellDep;
  };
}
const GITHUB_CELL_DEPS_JSON_URL =
  'https://raw.githubusercontent.com/ckb-cell/typeid-contract-cell-deps/main/deployment/cell-deps.json';

const fetchCellDepsJson = async () => {
  try {
    const response = await axios.get(GITHUB_CELL_DEPS_JSON_URL);
    return response.data as CellDepsObject;
  } catch (error) {
    console.error('Error fetching cell deps:', error);
  }
};

export const fetchRgbppAndConfigCellDeps = async (isMainnet: boolean): Promise<CKBComponents.CellDep[]> => {
  let rgbppLockDep = getRgbppLockDep(isMainnet);
  const cellDepsObj = await fetchCellDepsJson();
  if (cellDepsObj) {
    rgbppLockDep = isMainnet ? cellDepsObj.rgbpp.mainnet : cellDepsObj.rgbpp.testnet;
  }
  return [
    rgbppLockDep,
    {
      ...rgbppLockDep,
      outPoint: {
        ...rgbppLockDep.outPoint,
        index: '0x1',
      },
    },
  ] as CKBComponents.CellDep[];
};

export const fetchBtcTimeAndConfigCellDeps = async (isMainnet: boolean): Promise<CKBComponents.CellDep[]> => {
  let btcTimeCellDep = getBtcTimeLockDep(isMainnet);
  const cellDepsObj = await fetchCellDepsJson();
  if (cellDepsObj) {
    btcTimeCellDep = isMainnet ? cellDepsObj.btcTime.mainnet : cellDepsObj.btcTime.testnet;
  }
  return [
    btcTimeCellDep,
    {
      ...btcTimeCellDep,
      outPoint: {
        ...btcTimeCellDep.outPoint,
        index: '0x1',
      },
    },
  ] as CKBComponents.CellDep[];
};

export const fetchUniqueCellDep = async (isMainnet: boolean): Promise<CKBComponents.CellDep> => {
  let uniqueDep = getUniqueTypeDep(isMainnet);
  if (isMainnet) {
    // The mainnet deployment type of unique type script is data hash
    return uniqueDep;
  }
  const cellDepsObj = await fetchCellDepsJson();
  if (cellDepsObj) {
    uniqueDep = cellDepsObj.unique.testnet;
  }
  return uniqueDep;
};

export const fetchXudtCellDep = async (isMainnet: boolean): Promise<CKBComponents.CellDep> => {
  let xudtDep = getXudtDep(isMainnet);
  if (isMainnet) {
    // The mainnet deployment type of xudt type script is data hash
    return xudtDep;
  }
  const cellDepsObj = await fetchCellDepsJson();
  if (cellDepsObj) {
    xudtDep = cellDepsObj.xudt.testnet;
  }
  return xudtDep;
};

export const fetchRgbppXudtCellDeps = async (isMainnet: boolean): Promise<CKBComponents.CellDep[]> => {
  let rgbppLockDep = getRgbppLockDep(isMainnet);
  let xudtDep = getXudtDep(isMainnet);
  const cellDepsObj = await fetchCellDepsJson();
  if (cellDepsObj) {
    rgbppLockDep = isMainnet ? cellDepsObj.rgbpp.mainnet : cellDepsObj.rgbpp.testnet;
    if (!isMainnet) {
      xudtDep = cellDepsObj.xudt.testnet;
    }
  }
  return [
    rgbppLockDep,
    {
      ...rgbppLockDep,
      outPoint: {
        ...rgbppLockDep.outPoint,
        index: '0x1',
      },
    },
    xudtDep,
  ] as CKBComponents.CellDep[];
};

export const fetchBtcTimeXudtCellDeps = async (isMainnet: boolean): Promise<CKBComponents.CellDep[]> => {
  let btcTimeCellDep = getBtcTimeLockDep(isMainnet);
  let xudtDep = getXudtDep(isMainnet);
  const cellDepsObj = await fetchCellDepsJson();
  if (cellDepsObj) {
    btcTimeCellDep = isMainnet ? cellDepsObj.btcTime.mainnet : cellDepsObj.btcTime.testnet;
    if (!isMainnet) {
      xudtDep = cellDepsObj.xudt.testnet;
    }
  }
  return [
    btcTimeCellDep,
    {
      ...btcTimeCellDep,
      outPoint: {
        ...btcTimeCellDep.outPoint,
        index: '0x1',
      },
    },
    xudtDep,
  ] as CKBComponents.CellDep[];
};
