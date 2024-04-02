import { AddressPrefix, privateKeyToAddress, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { Collector, RgbppBtcAddressReceiver, buildRgbppLockArgs, genBtcBatchTransferCkbVirtualTx, genBtcTransferCkbVirtualTx } from '@rgbpp-sdk/ckb';
import { sendRgbppUtxos, DataSource, ECPair, bitcoin, NetworkType } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
// BTC SECP256K1 private key
const BTC_TEST_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001';
// API docs: https://btc-assets-api.testnet.mibao.pro/docs
const BTC_ASSETS_API_URL = 'https://btc-assets-api.testnet.mibao.pro';
// https://btc-assets-api.testnet.mibao.pro/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = '';

interface Params {
  rgbppLockArgsList: string[];
  receivers: RgbppBtcAddressReceiver[];
}
const batchTransferRgbppOnBtc = async ({ rgbppLockArgsList, receivers }: Params) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const isMainnet = false;
  const ckbAddress = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, {
    prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
  });
  console.log('ckb address: ', ckbAddress);
  // const fromLock = addressToScript(ckbAddress);

  const network = bitcoin.networks.testnet;
  const keyPair = ECPair.fromPrivateKey(Buffer.from(BTC_TEST_PRIVATE_KEY, 'hex'), { network });
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network,
  });

  console.log('btc address: ', btcAddress);

  const networkType = NetworkType.TESTNET;
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, 'https://btc-test.app');
  const source = new DataSource(service, networkType);

  const xudtType: CKBComponents.Script = {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  };

  const ckbVirtualTxResult = await genBtcBatchTransferCkbVirtualTx({
    collector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(xudtType),
    rgbppReceivers: receivers,
    isMainnet,
  });

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: receivers.map(receiver => receiver.toBtcAddress),
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
    await service.sendRgbppCkbTransaction({ btc_txid: btcTxId, ckb_virtual_result: ckbVirtualTxResult });
    const interval = setInterval(async () => {
      const { state, failedReason } = await service.getRgbppTransactionState(btcTxId);
      console.log('state', state);
      if (state === 'completed' || state === 'failed') {
        clearInterval(interval);
        if (state === 'completed') {
          const { txhash: txHash } = await service.getRgbppTransactionHash(btcTxId);
          console.info(`Rgbpp asset has been transferred on BTC and the related CKB tx hash is ${txHash}`);
        } else {
          console.warn(`Rgbpp CKB transaction failed and the reason is ${failedReason} `);
        }
      }
    }, 30 * 1000);
  } catch (error) {
    console.error(error);
  }
};

const receivers: RgbppBtcAddressReceiver[] = [
  {
    toBtcAddress: 'tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt',
    transferAmount: BigInt(800_0000_0000),
  },
];

// Use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
batchTransferRgbppOnBtc({
  rgbppLockArgsList: [buildRgbppLockArgs(1, '64252b582aea1249ed969a20385fae48bba35bf1ab9b3df3b0fcddc754ccf592')],
  receivers,
});
