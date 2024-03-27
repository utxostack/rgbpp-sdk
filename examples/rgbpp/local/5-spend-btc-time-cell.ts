import {
  AddressPrefix,
} from '@nervosnetwork/ckb-sdk-utils';
import {
  Collector,
  sendCkbTx,
  buildBtcTimeCellsSpentTx,
  getBtcTimeLockScript,
  signBtcTimeCellSpentTx,
} from '@rgbpp-sdk/ckb';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '';
// API docs: https://btc-assets-api.testnet.mibao.pro/docs
const BTC_ASSETS_API_URL = 'https://btc-assets-api.testnet.mibao.pro/';
// https://btc-assets-api.testnet.mibao.pro/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = '';

// Warning: Wait at least 6 BTC confirmation blocks to spend the BTC time cells after 4-btc-jump-ckb.ts
const spendBtcTimeCell = async ({ btcTimeCellArgs }: { btcTimeCellArgs: string }) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const address = collector.getCkb().utils.privateKeyToAddress(CKB_TEST_PRIVATE_KEY, { prefix: AddressPrefix.Testnet });
  console.log('ckb address: ', address);

  const btcTimeCells = await collector.getCells({
    lock: {
      ...getBtcTimeLockScript(false),
      args: btcTimeCellArgs,
    },
    isDataEmpty: false,
  });

  if (!btcTimeCells || btcTimeCells.length === 0) {
    throw new Error('No btc time cell found');
  }
  
  const btcAssetsApi = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, 'https://btc-test.app');

  let ckbRawTx: CKBComponents.RawTransaction = await buildBtcTimeCellsSpentTx({
    btcTimeCells,
    btcAssetsApi,
    isMainnet: false,
  });

  const signedTx = await signBtcTimeCellSpentTx({
    secp256k1PrivateKey: CKB_TEST_PRIVATE_KEY,
    collector,
    masterCkbAddress: address,
    ckbRawTx,
    isMainnet: false,
  });

  console.log(JSON.stringify(signedTx));

  const txHash = await sendCkbTx({ collector, signedTx });
  console.info(`BTC time cell has been spent and tx hash is ${txHash}`);
};

// The btcTimeCellArgs is from the outputs[0].lock.args(BTC Time lock args) of the 4-btc-jump-ckb.ts CKB transaction
spendBtcTimeCell({
  btcTimeCellArgs:
    '0x7f000000100000005b0000005f0000004b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac011600000000016c61f984f12d3c8a4f649e60acda5deda0b8837c060000001c95b9d726e4ab337d6a4572680598947954d7b6ff4f1e767e605eeeec49e7ed',
});
