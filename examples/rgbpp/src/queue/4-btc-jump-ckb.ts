import { AddressPrefix, privateKeyToAddress, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import {
  Collector,
  genBtcJumpCkbVirtualTx,
  buildRgbppLockArgs,
} from '@rgbpp-sdk/ckb';
import {
  sendRgbppUtxos,
  DataSource,
  NetworkType,
  bitcoin,
  ECPair,
} from '@rgbpp-sdk/btc';
import { BtcAssetsApi, RgbppTransactionState } from '@rgbpp-sdk/service'

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
// BTC SECP256K1 private key
const BTC_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
// https://btc-assets-api-develop.vercel.app/docs/static/index.html
const BTC_ASSETS_API_URL = 'https://btc-assets-api-url';
// https://btc-assets-api-develop.vercel.app/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = '';

interface Params {
  rgbppLockArgsList: string[];
  toCkbAddress: string;
  transferAmount: bigint;
}
const jumpFromBtcToCkb = async ({ rgbppLockArgsList, toCkbAddress, transferAmount }: Params) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const address = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, { prefix: AddressPrefix.Testnet });
  console.log('ckb address: ', address);

  const network = bitcoin.networks.testnet;
  const keyPair = ECPair.fromPrivateKey(Buffer.from(BTC_TEST_PRIVATE_KEY, 'hex'), { network });
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network,
  });
  console.log('btc address: ', btcAddress);

  const networkType = NetworkType.TESTNET;
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, 'http://localhost');
  const source = new DataSource(service, networkType);

  const xudtType: CKBComponents.Script = {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  };

  const ckbVirtualTxResult = await genBtcJumpCkbVirtualTx({
    collector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount,
    toCkbAddress,
    isMainnet: false,
  });

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [btcAddress!], 
    ckbCollector: collector,
    from: btcAddress!,
    source,
  });
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  const btcTx = psbt.extractTransaction();
  const { txid: btcTxId } = await service.sendBtcTransaction(btcTx.toHex());

  console.log('BTC TxId: ', btcTxId);

  try {
    await service.sendRgbppCkbTransaction(ckbVirtualTxResult);
    const interval = setInterval(async () => {
      const { state } = await service.getRgbppTransactionState(btcTxId);
      console.log('state', state);
      if (state === RgbppTransactionState.Completed) {
        clearInterval(interval);
      }
    }, 20 * 1000);
  } catch (error) {
    console.error(error);
  }
};

// rgbppLockArgs: outIndexU32 + btcTxId
jumpFromBtcToCkb({
  // If the `3-btc-transfer.ts` has been executed, the BTC txId should be the new generated BTC txId by the `3-btc-transfer.ts`
  // Otherwise the BTC txId should be same as the the BTC txId of the `2-ckb-jump-btc.ts`
  rgbppLockArgsList: [buildRgbppLockArgs(1, '53e7c02eba522d1e3b0698b4bf5405c25c33b32e7df84a1a6c19e2cf165681f0')],
  toCkbAddress: 'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9kxr7vy7yknezj0vj0xptx6thk6pwyr0sxamv6q',
  // To simplify, keep the transferAmount the same as 2-ckb-jump-btc
  transferAmount: BigInt(800_0000_0000),
});

