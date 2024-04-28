import { AddressPrefix, privateKeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
import {
  Collector,
  sendCkbTx,
  getBtcTimeLockScript,
  buildSporeBtcTimeCellsSpentTx,
  signBtcTimeCellSpentTx,
} from '@rgbpp-sdk/ckb';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
// API docs: https://btc-assets-api.testnet.mibao.pro/docs
const BTC_ASSETS_API_URL = 'https://btc-assets-api.testnet.mibao.pro';
// https://btc-assets-api.testnet.mibao.pro/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = '';

const BTC_ASSETS_ORIGIN = 'https://btc-test.app';

// Warning: Wait at least 6 BTC confirmation blocks to spend the BTC time cells after 4-btc-jump-ckb.ts
const unlockSporeBtcTimeCell = async ({ btcTimeCellArgs }: { btcTimeCellArgs: string }) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const isMainnet = false;

  const address = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, {
    prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
  });
  console.log('ckb address: ', address);

  const btcTimeCells = await collector.getCells({
    lock: {
      ...getBtcTimeLockScript(false),
      args: btcTimeCellArgs,
    },
    isDataEmpty: false,
  });

  if (!btcTimeCells || btcTimeCells.length === 0) {
    throw new Error('No btc time cells found');
  }

  const btcAssetsApi = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, BTC_ASSETS_ORIGIN);

  const ckbRawTx: CKBComponents.RawTransaction = await buildSporeBtcTimeCellsSpentTx({
    btcTimeCells,
    btcAssetsApi,
    isMainnet,
  });

  const signedTx = await signBtcTimeCellSpentTx({
    secp256k1PrivateKey: CKB_TEST_PRIVATE_KEY,
    collector,
    masterCkbAddress: address,
    ckbRawTx,
    isMainnet,
  });

  const txHash = await sendCkbTx({ collector, signedTx });
  console.info(`Spore BTC time cell has been unlocked and tx hash is ${txHash}`);
};

// The btcTimeCellArgs is from the outputs[0].lock.args(BTC Time lock args) of the 5-leap-spore-to-ckb.ts CKB transaction
unlockSporeBtcTimeCell({
  btcTimeCellArgs:
    '0x7d00000010000000590000005d000000490000001000000030000000310000009bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce80114000000f9a9ad51ed14936d33f7bb854aaefa5f47a3ccbd060000002997fa043e977cb0a9bcc75ec308ad1323331c5295caf8fc721b0a2761bef305',
});
