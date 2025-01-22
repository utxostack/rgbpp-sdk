import axios from 'axios';
import {
  getBtcTimeLockDep,
  getRgbppLockDep,
  getUniqueTypeDep,
  getUtxoAirdropBadgeTypeDep,
  getXudtDep,
} from '../constants';
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
  utxoAirdropBadge: {
    testnet: CKBComponents.CellDep;
    mainnet: CKBComponents.CellDep;
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

const VERCEL_CELL_DEPS_JSON_STATIC_URL = 'https://typeid-contract-cell-deps.vercel.app/deployment/cell-deps.json';

const VERCEL_SERVER_CELL_DEPS_JSON_URL = 'https://typeid-contract-cell-deps.vercel.app/api/cell-deps';

const request = (url: string) => axios.get(url, { timeout: 10000 });

const fetchCellDepsJsonFromStaticSource = async () => {
  try {
    const response = await Promise.any([
      request(CDN_GITHUB_CELL_DEPS_JSON_URL),
      request(GITHUB_CELL_DEPS_JSON_URL),
      request(VERCEL_CELL_DEPS_JSON_STATIC_URL),
    ]);
    return response.data as CellDepsObject;
  } catch (error) {
    // for (const e of error.errors) {
    //   console.error('Error fetching cell deps from static source:', e);
    // }
  }
};

export const fetchCellDepsJson = async () => {
  try {
    const response = await request(VERCEL_SERVER_CELL_DEPS_JSON_URL);
    if (response && response.data) {
      return response.data as CellDepsObject;
    }
    return await fetchCellDepsJsonFromStaticSource();
  } catch (error) {
    // console.error('Error fetching cell deps from vercel server:', error);
    return await fetchCellDepsJsonFromStaticSource();
  }
};

export interface CellDepsSelected {
  rgbpp?: boolean;
  btcTime?: boolean;
  xudt?: boolean;
  unique?: boolean;
  compatibleXudtCodeHashes?: string[];
  utxoAirdropBadge?: boolean;
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
  let utxoAirdropBadgeDep = getUtxoAirdropBadgeTypeDep(isMainnet);

  const cellDepsObj = vendorCellDeps ?? (await fetchCellDepsJson());

  if (selected.rgbpp === true) {
    if (cellDepsObj?.rgbpp) {
      const { signet, testnet, mainnet } = cellDepsObj.rgbpp;
      if (btcTestnetType === 'Signet') {
        rgbppLockDep = signet;
      } else {
        rgbppLockDep = isMainnet ? mainnet : testnet;
      }
    }
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
    if (cellDepsObj?.btcTime) {
      const { signet, testnet, mainnet } = cellDepsObj.btcTime;
      if (btcTestnetType === 'Signet') {
        btcTimeDep = signet;
      } else {
        btcTimeDep = isMainnet ? mainnet : testnet;
      }
    }
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
    if (!isMainnet && cellDepsObj?.xudt) {
      xudtDep = cellDepsObj.xudt.testnet;
    }
    cellDeps = [...cellDeps, xudtDep] as CKBComponents.CellDep[];
  }

  if (selected.unique === true) {
    if (!isMainnet && cellDepsObj?.unique) {
      uniqueDep = cellDepsObj.unique.testnet;
    }
    cellDeps = [...cellDeps, uniqueDep] as CKBComponents.CellDep[];
  }

  if (selected.utxoAirdropBadge === true) {
    if (cellDepsObj?.utxoAirdropBadge) {
      utxoAirdropBadgeDep = isMainnet ? cellDepsObj.utxoAirdropBadge.mainnet : cellDepsObj.utxoAirdropBadge.testnet;
    }
    cellDeps = [...cellDeps, utxoAirdropBadgeDep] as CKBComponents.CellDep[];
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
