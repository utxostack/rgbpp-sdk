import axios from 'axios';
import { getBtcTimeLockDep, getRgbppLockDep, getUniqueTypeDep, getXudtDep } from '../constants';
import { BTCTestnetType } from '../types';

export interface CellDepsObject {
  rgbpp: {
    mainnet: CKBComponents.CellDep;
    testnet: CKBComponents.CellDep;
    signet: CKBComponents.CellDep;
  };
  btcTime: {
    mainnet: CKBComponents.CellDep;
    testnet: CKBComponents.CellDep;
    signet: CKBComponents.CellDep;
  };
  xudt: {
    testnet: CKBComponents.CellDep;
  };
  unique: {
    testnet: CKBComponents.CellDep;
  };
  compatibleXudt: {
    [codeHash: string]: CKBComponents.CellDep;
  };
}
const GITHUB_CELL_DEPS_JSON_URL =
  'https://raw.githubusercontent.com/utxostack/typeid-contract-cell-deps/main/deployment/cell-deps.json';

// If the CDN has cache issue, please clear the cache by visiting
// https://www.jsdelivr.com/tools/purge?path=/gh/utxostack/typeid-contract-cell-deps@main
const CDN_GITHUB_CELL_DEPS_JSON_URL =
  'https://cdn.jsdelivr.net/gh/utxostack/typeid-contract-cell-deps@main/deployment/cell-deps.json';

const request = (url: string) => axios.get(url, { timeout: 5000 });

export const fetchCellDepsJson = async () => {
  try {
    const response = await Promise.any([request(CDN_GITHUB_CELL_DEPS_JSON_URL), request(GITHUB_CELL_DEPS_JSON_URL)]);
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
  compatibleXudtCodeHashes?: string[];
}

export const fetchTypeIdCellDeps = async (
  isMainnet: boolean,
  selected: CellDepsSelected,
  btcTestnetType?: BTCTestnetType,
  vendorCellDeps?: CellDepsObject,
): Promise<CKBComponents.CellDep[]> => {
  let cellDeps: CKBComponents.CellDep[] = [];

  let rgbppLockDep = getRgbppLockDep(isMainnet, btcTestnetType);
  let btcTimeDep = getBtcTimeLockDep(isMainnet, btcTestnetType);
  let xudtDep = getXudtDep(isMainnet);
  let uniqueDep = getUniqueTypeDep(isMainnet);

  const cellDepsObj = vendorCellDeps ?? (await fetchCellDepsJson());

  if (cellDepsObj) {
    if (btcTestnetType === 'Signet') {
      rgbppLockDep = cellDepsObj.rgbpp.signet;
      btcTimeDep = cellDepsObj.btcTime.signet;
    } else {
      rgbppLockDep = isMainnet ? cellDepsObj.rgbpp.mainnet : cellDepsObj.rgbpp.testnet;
      btcTimeDep = isMainnet ? cellDepsObj.btcTime.mainnet : cellDepsObj.btcTime.testnet;
    }
    if (!isMainnet) {
      xudtDep = cellDepsObj.xudt.testnet;
      uniqueDep = cellDepsObj.unique.testnet;
    }
  }

  if (selected.rgbpp === true) {
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

  if (selected.btcTime === true) {
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

  if (selected.xudt === true) {
    cellDeps = [...cellDeps, xudtDep] as CKBComponents.CellDep[];
  }

  if (selected.unique === true) {
    cellDeps = [...cellDeps, uniqueDep] as CKBComponents.CellDep[];
  }

  /**
   * "compatibleXudt": {
    "0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a": {
      "outPoint": {
        "index": "0x0",
        "txHash": "0xed7d65b9ad3d99657e37c4285d585fea8a5fcaf58165d54dacf90243f911548b"
      },
      "depType": "code"
    },
    "0x26a33e0815888a4a0614a0b7d09fa951e0993ff21e55905510104a0b1312032b": {
      "outPoint": {
        "index": "0x0",
        "txHash": "0x8ec1081bd03e5417bb4467e96f4cec841acdd35924538a35e7547fe320118977"
      },
      "depType": "code"
    }
  }
   */
  if (selected.compatibleXudtCodeHashes && selected.compatibleXudtCodeHashes?.length > 0) {
    if (cellDepsObj?.compatibleXudt === undefined) {
      throw new Error('Compatible xUDT cell deps are null');
    }
    const compatibleCellDeps = selected.compatibleXudtCodeHashes.map(
      (codeHash) => cellDepsObj.compatibleXudt[codeHash],
    );
    if (compatibleCellDeps.length === 0) {
      throw new Error('The specific compatible xUDT cell deps are not found');
    }
    cellDeps = [...cellDeps, ...compatibleCellDeps] as CKBComponents.CellDep[];
  }

  return cellDeps;
};
