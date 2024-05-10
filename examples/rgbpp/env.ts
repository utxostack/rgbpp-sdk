import { AddressPrefix, privateKeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
import { DataSource, BtcAssetsApi } from 'rgbpp';
import { ECPair, ECPairInterface, bitcoin, NetworkType } from 'rgbpp/btc';
import dotenv from 'dotenv';
import { Collector } from 'rgbpp/ckb';

dotenv.config({ path: __dirname + '/.env' });

export const isMainnet = process.env.IS_MAINNET === 'true' ? true : false;

export const collector = new Collector({
  ckbNodeUrl: process.env.CKB_NODE_URL!,
  ckbIndexerUrl: process.env.CKB_INDEXER_URL!,
});
export const CKB_PRIVATE_KEY = process.env.CKB_SECP256K1_PRIVATE_KEY!;
export const ckbAddress = privateKeyToAddress(CKB_PRIVATE_KEY, {
  prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
});

export const BTC_PRIVATE_KEY = process.env.BTC_PRIVATE_KEY!;
export const BTC_ASSETS_API_URL = process.env.BTC_ASSETS_API_URL!;
export const BTC_ASSETS_TOKEN = process.env.BTC_ASSETS_TOKEN!;
export const BTC_ASSETS_ORIGIN = process.env.BTC_ASSETS_ORIGIN!;

const network = isMainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
export const btcKeyPair: ECPairInterface = ECPair.fromPrivateKey(Buffer.from(BTC_PRIVATE_KEY, 'hex'), { network });
export const { address: btcAddress } = bitcoin.payments.p2wpkh({
  pubkey: btcKeyPair.publicKey,
  network,
});

const networkType = isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
export const btcService = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, BTC_ASSETS_ORIGIN);
export const btcDataSource = new DataSource(btcService, networkType);
