import {
  blake160,
  bytesToHex,
  privateKeyToPublicKey,
  scriptToAddress,
  systemScripts,
} from '@nervosnetwork/ckb-sdk-utils';
import { DataSource, BtcAssetsApi, AddressType } from 'rgbpp';
import { ECPair, ECPairInterface, bitcoin, NetworkType } from 'rgbpp/btc';
import dotenv from 'dotenv';
import { Collector } from 'rgbpp/ckb';
import { createBtcAccount } from '../../examples/rgbpp/shared/btc-account';

dotenv.config({ path: __dirname + '/.env' });

export const isMainnet = false;

export const BTC_TESTNET_TYPE = 'Signet';

export const collector = new Collector({
  ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
  ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
});
export const CKB_PRIVATE_KEY = process.env.INTEGRATION_CKB_PRIVATE_KEY!;
const secp256k1Lock: CKBComponents.Script = {
  ...systemScripts.SECP256K1_BLAKE160,
  args: bytesToHex(blake160(privateKeyToPublicKey(CKB_PRIVATE_KEY))),
};
export const ckbAddress = scriptToAddress(secp256k1Lock, isMainnet);

export const BTC_PRIVATE_KEY = process.env.INTEGRATION_BTC_PRIVATE_KEY!;
export const BTC_SERVICE_URL = process.env.VITE_SERVICE_URL!;
export const BTC_SERVICE_TOKEN = process.env.VITE_SERVICE_TOKEN!;
export const BTC_SERVICE_ORIGIN = process.env.VITE_SERVICE_ORIGIN!;

const network = isMainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
export const btcKeyPair: ECPairInterface = ECPair.fromPrivateKey(Buffer.from(BTC_PRIVATE_KEY, 'hex'), { network });

// Read more about the available address types:
// - P2WPKH: https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki#p2wpkh
// - P2TR: https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki
const addressType = AddressType.P2WPKH;
const networkType = isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
export const btcAccount = createBtcAccount(BTC_PRIVATE_KEY, addressType, networkType);

export const btcService = BtcAssetsApi.fromToken(BTC_SERVICE_URL, BTC_SERVICE_TOKEN, BTC_SERVICE_ORIGIN);
export const btcDataSource = new DataSource(btcService, networkType);
