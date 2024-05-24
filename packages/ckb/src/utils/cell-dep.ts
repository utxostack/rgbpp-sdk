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
    // console.error('Error fetching cell deps:', error);
  }
};

export interface CellDepsSelected {
  rgbpp?: boolean;
  btcTime?: boolean;
  xudt?: boolean;
  unique?: boolean;
}

export const fetchTypeIdCellDeps = async (
  isMainnet: boolean,
  selected: CellDepsSelected,
): Promise<CKBComponents.CellDep[]> => {
  let rgbppLockDep = getRgbppLockDep(isMainnet);
  let btcTimeDep = getBtcTimeLockDep(isMainnet);
  let xudtDep = getXudtDep(isMainnet);
  let uniqueDep = getUniqueTypeDep(isMainnet);

  const cellDepsObj = await fetchCellDepsJson();
  if (cellDepsObj) {
    rgbppLockDep = isMainnet ? cellDepsObj.rgbpp.mainnet : cellDepsObj.rgbpp.testnet;
    btcTimeDep = isMainnet ? cellDepsObj.btcTime.mainnet : cellDepsObj.btcTime.testnet;
    if (!isMainnet) {
      xudtDep = cellDepsObj.xudt.testnet;
      uniqueDep = cellDepsObj.unique.testnet;
    }
  }
  let cellDeps: CKBComponents.CellDep[] = [];
  if (selected.rgbpp) {
    // RGB++ config cell is deployed together with the RGB++ lock contract
    //
    // contract_deployment_transaction:
    //   - output(index=0, data=rgbpp_code)
    //   - output(index=1, data=rgbpp_config)
    //
    cellDeps = [
      ...cellDeps,
      rgbppLockDep,
      {
        ...rgbppLockDep,
        outPoint: {
          ...rgbppLockDep.outPoint,
          index: '0x1',
        },
      },
    ] as CKBComponents.CellDep[];
  }

  if (selected.btcTime) {
    // BTC Time config cell is deployed together with the BTC Time lock contract
    //
    // contract_deployment_transaction:
    //   - output(index=0, data=rgbpp_code)
    //   - output(index=1, data=rgbpp_config)
    //
    cellDeps = [
      ...cellDeps,
      btcTimeDep,
      {
        ...btcTimeDep,
        outPoint: {
          ...btcTimeDep.outPoint,
          index: '0x1',
        },
      },
    ] as CKBComponents.CellDep[];
  }

  if (selected.xudt) {
    cellDeps = [...cellDeps, xudtDep] as CKBComponents.CellDep[];
  }

  if (selected.unique) {
    cellDeps = [...cellDeps, uniqueDep] as CKBComponents.CellDep[];
  }

  return cellDeps;
};
