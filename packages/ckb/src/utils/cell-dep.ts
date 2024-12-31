import axios from 'axios';
import { getBtcTimeLockDep, getRgbppLockDep, getUniqueTypeDep, getXudtDep } from '../constants';
import { BTCTestnetType } from '../types';

interface CellDepsObject {
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
  'https://raw.githubusercontent.com/ckb-cell/typeid-contract-cell-deps/main/deployment/cell-deps.json';

const CDN_GITHUB_CELL_DEPS_JSON_URL =
  'https://cdn.jsdelivr.net/gh/ckb-cell/typeid-contract-cell-deps@main/deployment/cell-deps.json';

const request = (url: string) => axios.get(url, { timeout: 2000 });

const fetchCellDepsJson = async () => {
  try {
    const response = await Promise.any([request(GITHUB_CELL_DEPS_JSON_URL), request(CDN_GITHUB_CELL_DEPS_JSON_URL)]);
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
): Promise<CKBComponents.CellDep[]> => {
  let cellDeps: CKBComponents.CellDep[] = [];

  let rgbppLockDep = getRgbppLockDep(isMainnet, btcTestnetType);
  let btcTimeDep = getBtcTimeLockDep(isMainnet, btcTestnetType);
  let xudtDep = getXudtDep(isMainnet);
  let uniqueDep = getUniqueTypeDep(isMainnet);

  const cellDepsObj = await fetchCellDepsJson();
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

  /**
   * "compatibleXudt": {
    "0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb": {
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
      throw new Error('Compatible xUDT cell deps are not found');
    }
    const compatibleCellDeps = selected.compatibleXudtCodeHashes.map(
      (codeHash) => cellDepsObj.compatibleXudt[codeHash],
    );
    cellDeps = [...cellDeps, ...compatibleCellDeps] as CKBComponents.CellDep[];
  }

  return cellDeps;
};
