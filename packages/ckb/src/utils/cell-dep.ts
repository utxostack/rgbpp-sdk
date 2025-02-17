import axios from 'axios';
import {
  COMPATIBLE_XUDT_TYPE_SCRIPTS,
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

const VERCEL_CELL_DEPS_JSON_STATIC_URL = 'https://typeid-contract-cell-deps.vercel.app/deployment/cell-deps.json';

const VERCEL_SERVER_CELL_DEPS_JSON_URL = 'https://typeid-contract-cell-deps.vercel.app/api/cell-deps';

const request = (url: string) => axios.get(url, { timeout: 10000 });

const fetchCellDepsJsonFromStaticSource = async () => {
  try {
    const response = await Promise.any([request(VERCEL_CELL_DEPS_JSON_STATIC_URL), request(GITHUB_CELL_DEPS_JSON_URL)]);
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
    let compatibleCellDeps = selected.compatibleXudtCodeHashes.map((codeHash) => cellDepsObj.compatibleXudt[codeHash]);
    compatibleCellDeps = Array.from(new Set(compatibleCellDeps));
    if (compatibleCellDeps.length === 0) {
      throw new Error('The specific compatible xUDT cell deps are not found');
    }
    cellDeps = [...cellDeps, ...compatibleCellDeps] as CKBComponents.CellDep[];
  }

  return cellDeps;
};

const VERCEL_STATIC_COMPATIBLE_XUDT_URL = 'https://typeid-contract-cell-deps.vercel.app/compatible-udt.json';
const GITHUB_STATIC_COMPATIBLE_XUDT_URL =
  'https://raw.githubusercontent.com/utxostack/typeid-contract-cell-deps/main/compatible-udt.json';

/**
 * The `CompatibleXUDTRegistry` class is responsible for managing a cache of compatible XUDT (eXtensible User-Defined Token) scripts.
 * It fetches and caches the compatible tokens from specified URLs and refreshes the cache periodically.
 * Alternatively, the compatible tokens can also be fetched from the static list only when offline mode is enabled.
 */
export class CompatibleXUDTRegistry {
  private static cache: CKBComponents.Script[] = [];
  private static lastFetchTime: number = 0;
  private static CACHE_DURATION = 3 * 60 * 1000; // 3 minutes ([about 24 CKB blocks](https://docs-old.nervos.org/docs/essays/tx-confirmation))
  private static xudtUrl = VERCEL_STATIC_COMPATIBLE_XUDT_URL;

  // If you want to get the latest compatible xUDT list, CompatibleXUDTRegistry.refreshCache should be called first
  static getCompatibleTokens(offline?: boolean): CKBComponents.Script[] {
    if (offline) {
      return COMPATIBLE_XUDT_TYPE_SCRIPTS;
    }

    const now = Date.now();
    if (this.cache.length === 0 || now - this.lastFetchTime > this.CACHE_DURATION) {
      this.refreshCache(this.xudtUrl);
    }
    return this.cache.length > 0 ? this.cache : COMPATIBLE_XUDT_TYPE_SCRIPTS;
  }

  /**
   * Refreshes the cache by fetching data from the provided URL or a default URL.
   *
   * This method attempts to fetch data from the provided URL or a default URL
   * using `Promise.any` to handle multiple potential sources. If the fetch is
   * successful, it updates the cache with the fetched data and sets the last
   * fetch time to the current timestamp.
   *
   * @param url - An optional URL to fetch data from. If not provided, a default
   * URL (`VERCEL_CELL_DEPS_JSON_STATIC_URL`) will be used.
   * @returns A promise that resolves when the cache has been refreshed.
   */
  static async refreshCache(url?: string): Promise<void> {
    this.xudtUrl = url ?? VERCEL_STATIC_COMPATIBLE_XUDT_URL;
    const isExternal = url !== VERCEL_STATIC_COMPATIBLE_XUDT_URL && url !== GITHUB_STATIC_COMPATIBLE_XUDT_URL;
    try {
      const response = await (isExternal
        ? request(this.xudtUrl)
        : Promise.any([request(this.xudtUrl), request(GITHUB_STATIC_COMPATIBLE_XUDT_URL)]));
      if (response && response.data) {
        const xudtList = response.data as { codeHash: string }[];
        this.cache = xudtList.map((xudt) => {
          return {
            codeHash: xudt.codeHash,
            hashType: 'type',
          } as CKBComponents.Script;
        });
      }
      this.lastFetchTime = Date.now();
    } catch (error) {
      // console.error(error)
    }
  }
}
