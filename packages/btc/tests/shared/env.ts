import { BtcAssetsApi } from '@rgbpp-sdk/service';
import { DataSource, NetworkType, networkTypeToConfig } from '../../src';
import { createAccount } from './utils.js';

export const networkType = NetworkType.TESTNET;
export const config = networkTypeToConfig(networkType);
export const network = config.network;

export const service = BtcAssetsApi.fromToken(
  process.env.VITE_BTC_SERVICE_URL!,
  process.env.VITE_BTC_SERVICE_TOKEN!,
  process.env.VITE_BTC_SERVICE_ORIGIN!,
);

export const source = new DataSource(service, networkType);

export const accounts = {
  charlie: createAccount({
    privateKey: '8d3c23d340ac0841e6c3b58a9bbccb9a28e94ab444f972cff35736fa2fcf9f3f',
    network,
  }),
};
