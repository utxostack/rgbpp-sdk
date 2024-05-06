import 'dotenv/config';
import { bitcoin, DataSource, ECPair, NetworkType } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';
import { Collector } from '@rgbpp-sdk/ckb';
import { AddressPrefix, addressToScript, privateKeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
import * as fs from 'fs';
import * as path from 'path';


export const CKB_PRIVATE_KEY = process.env.CKB_PRIVATE_KEY!;

// BTC SECP256K1 private key
const BTC_PRIVATE_KEY = process.env.BTC_PRIVATE_KEY!;
// API docs: https://btc-assets-api.testnet.mibao.pro/docs
const BTC_ASSETS_API_URL = process.env.BTC_ASSETS_API_URL!;
// https://btc-assets-api.testnet.mibao.pro/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = process.env.BTC_ASSETS_TOKEN!;

const BTC_ASSETS_ORIGIN = process.env.BTC_ASSETS_ORIGIN!;


export const network = process.env.NETWORK!;


export function getDeployVariables() {
  const isMainnet = network === 'false';
  const btcNetwork = isMainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  // console.log(btcNetwork);
  console.log(BTC_PRIVATE_KEY);
  const btcKeyPair = ECPair.fromPrivateKey(Buffer.from(BTC_PRIVATE_KEY, 'hex'), { network: btcNetwork });
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: btcKeyPair.publicKey,
    network: btcNetwork,
  });

  const networkType = isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, BTC_ASSETS_ORIGIN);
  const source = new DataSource(service, networkType);
  const collector = new Collector({
    ckbNodeUrl: process.env.CKB_NODE_URL!,
    ckbIndexerUrl: process.env.CKB_INDEXER_URL!,
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
