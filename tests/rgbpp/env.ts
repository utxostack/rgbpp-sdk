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
import { BTCTestnetType, Collector } from 'rgbpp/ckb';
import { createBtcAccount } from '../../examples/rgbpp/shared/btc-account';

dotenv.config({ path: __dirname + '/.env' });

export const isMainnet = false;
// export const BTC_TESTNET_TYPE = 'Signet';
export const BTC_TESTNET_TYPE = process.env.BTC_TESTNET_TYPE! as BTCTestnetType;

export const collector = new Collector({
  ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
  ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
});
export const CKB_PRIVATE_KEY = '0x469cc5b62555090f376866fe3fe780339104cfdcf5011e7d887d71bb99ca2e2b';
const secp256k1Lock: CKBComponents.Script = {
  ...systemScripts.SECP256K1_BLAKE160,
  args: bytesToHex(blake160(privateKeyToPublicKey(CKB_PRIVATE_KEY))),
};
export const ckbAddress = scriptToAddress(secp256k1Lock, isMainnet);

export const BTC_PRIVATE_KEY = '5c213d9478a310fcf9fb4a973d1b4a7592769b4bccbda335b5c1886a3929a00b';
export const BTC_SERVICE_URL = 'https://api.signet.rgbpp.io';
export const BTC_SERVICE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJteS1hcHAiLCJhdWQiOiJhcGkuc2lnbmV0LnJnYnBwLmlvIiwianRpIjoiZWJkMGJlNGYtZTZlNS00M2M4LTlmMmMtNGUwYjk3YWM1ZjVkIiwiaWF0IjoxNzE4NTk1Mzg2fQ.8Q35BzMYHNHS0Fqe_4coALnIsBDVUm3Ro-zF6SN83PM';
export const BTC_SERVICE_ORIGIN = 'https://api.signet.rgbpp.io';

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
