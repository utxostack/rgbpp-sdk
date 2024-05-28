import { AddressPrefix, privateKeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
import { DataSource, BtcAssetsApi } from 'rgbpp';
import { ECPair, ECPairInterface, bitcoin, NetworkType } from 'rgbpp/btc';
import dotenv from 'dotenv';
import { Collector } from 'rgbpp/ckb';

dotenv.config({ path: __dirname + '/.env' });

export const isMainnet = false;

export const collector = new Collector({
  ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
  ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
});
export const CKB_PRIVATE_KEY = process.env.INTEGRATION_CKB_PRIVATE_KEY!;
export const ckbAddress = privateKeyToAddress(CKB_PRIVATE_KEY, {
  prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
});

export const BTC_PRIVATE_KEY = process.env.INTEGRATION_BTC_PRIVATE_KEY!;
export const BTC_SERVICE_URL = process.env.VITE_SERVICE_URL!;
export const BTC_SERVICE_TOKEN = process.env.VITE_SERVICE_TOKEN!;
export const BTC_SERVICE_ORIGIN = process.env.VITE_SERVICE_ORIGIN!;

const network = isMainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
export const btcKeyPair: ECPairInterface = ECPair.fromPrivateKey(Buffer.from(BTC_PRIVATE_KEY, 'hex'), { network });
export const { address: btcAddress } = bitcoin.payments.p2wpkh({
  pubkey: btcKeyPair.publicKey,
  network,
});

const networkType = isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
export const btcService = BtcAssetsApi.fromToken(BTC_SERVICE_URL, BTC_SERVICE_TOKEN, BTC_SERVICE_ORIGIN);
export const btcDataSource = new DataSource(btcService, networkType);
