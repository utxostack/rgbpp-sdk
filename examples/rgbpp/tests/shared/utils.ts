import 'dotenv/config';
import { bitcoin, DataSource, ECPair, NetworkType } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';
import { Collector } from '@rgbpp-sdk/ckb';
import { AddressPrefix, addressToScript, privateKeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
import * as fs from 'fs';
import * as path from 'path';

export const CKB_PRIVATE_KEY = '0x4ea7c74d8296f0063d61f62cb71cd9e4a7bb758f1e25a66f0c4809fc4123fa49';

// BTC SECP256K1 private key
const BTC_PRIVATE_KEY = '9028533606d62fd48c00009d02f0c706e82b1d5ee848bdc9b6cbd7bb26eb94ac';
// API docs: https://btc-assets-api.testnet.mibao.pro/docs
const BTC_ASSETS_API_URL = 'https://btc-assets-api.testnet.mibao.pro';
// https://btc-assets-api.testnet.mibao.pro/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJteS1hcHAiLCJhdWQiOiJidGMtYXNzZXRzLWFwaS50ZXN0bmV0Lm1pYmFvLnBybyIsImp0aSI6ImJiYmNjZjMyLTNlMjctNDQ3MS1iNDJkLTU0Mzg4ZDU4MzliMSIsImlhdCI6MTcxMzc2MzgwMX0.vsevi5y_j7x_IFj3INXs9KIeMx5tIIWKhkGHun48b1s\n';

const BTC_ASSETS_ORIGIN = 'https://btc-assets-api.testnet.mibao.pro';


export const network = "testnet";


export function getDeployVariables() {
  const isMainnet = false;
  const btcNetwork = isMainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  const btcKeyPair = ECPair.fromPrivateKey(Buffer.from(BTC_PRIVATE_KEY, 'hex'), { network: btcNetwork });
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: btcKeyPair.publicKey,
    network: btcNetwork,
  });

  const networkType = isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, BTC_ASSETS_ORIGIN);
  const source = new DataSource(service, networkType);
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });

  const ckbAddress = privateKeyToAddress(CKB_PRIVATE_KEY, {
    prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
  });
  const ckbMasterLock = addressToScript(ckbAddress);

  return {
    btcKeyPair,
    btcAddress,
    service,
    source,
    collector,
    ckbAddress,
    ckbMasterLock,
    isMainnet,
  };
}

export async function getFastestFeeRate() {
  const { service } = getDeployVariables();
  const fees = await service.getBtcRecommendedFeeRates();
  return Math.ceil(fees.fastestFee * 3);
}

export async function writeStepLog(step: string, data: string | object) {
  const file = path.join(__dirname, `../${network}/step-${step}.log`);

  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }

  fs.writeFileSync(file, data);
}

export function readStepLog(step: string) {
  const file = path.join(__dirname, `../${network}/step-${step}.log`);
  return JSON.parse(fs.readFileSync(file).toString());
}
