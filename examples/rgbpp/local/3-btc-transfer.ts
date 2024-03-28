import { AddressPrefix, privateKeyToAddress, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import {
  Collector,
  appendCkbTxWitnesses,
  buildRgbppLockArgs,
  genBtcTransferCkbVirtualTx,
  sendCkbTx,
  updateCkbTxWithRealBtcTxId,
} from '@rgbpp-sdk/ckb';
import { transactionToHex, sendRgbppUtxos, DataSource, ECPair, bitcoin, NetworkType } from '@rgbpp-sdk/btc';
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
  toBtcAddress: string;
  transferAmount: bigint;
}
const transferRgbppOnBtc = async ({ rgbppLockArgsList, toBtcAddress, transferAmount }: Params) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const ckbAddress = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, { prefix: AddressPrefix.Testnet });
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

  const ckbVirtualTxResult = await genBtcTransferCkbVirtualTx({
    collector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount,
    isMainnet: false,
  });

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [toBtcAddress],
    ckbCollector: collector,
    from: btcAddress!,
    source,
  });
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  const btcTx = psbt.extractTransaction();
  // Remove the witness from BTC tx for RGBPP unlock
  const btcTxBytes = transactionToHex(btcTx, false);
  const { txid: btcTxId } = await service.sendBtcTransaction(btcTx.toHex());

  console.log('BTC Tx bytes: ', btcTxBytes);
  console.log('BTC TxId: ', btcTxId);
  console.log('ckbRawTx', JSON.stringify(ckbRawTx));

  /*****************************************************************************************************************/
  // Warning: Please wait for the btc transaction to be confirmed, and use the above printed data to assign values to the following three variables
  // and delete the following annotations

  // const btcTxId = '24e622419156dd3a277a90bcbb40c7117462a18d5329dd1ada320ca8bdfba715';
  // const btcTxBytes =
  //   '020000000148532c874cddb14d823d393be71c50e21e1ee4944e7a7fb4337acca3e250b2700100000000ffffffff020000000000000000226a20471d64b13b15b8359823169ba75f771479234ae6cc29eed4fb2eb4fd1e2fab6d1d320f000000000016001462fc12a35b779f0cf7edcb9690be19b0386e0f9a00000000';
  // const ckbRawTx = JSON.parse(
  //   `{"version":"0x0","cellDeps":[{"outPoint":{"txHash":"0xf1de59e973b85791ec32debbba08dff80c63197e895eb95d67fc1e9f6b413e00","index":"0x0"},"depType":"code"},{"outPoint":{"txHash":"0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f","index":"0x0"},"depType":"code"},{"outPoint":{"txHash":"0xf1de59e973b85791ec32debbba08dff80c63197e895eb95d67fc1e9f6b413e00","index":"0x1"},"depType":"code"}],"headerDeps":[],"inputs":[{"previousOutput":{"txHash":"0x5711745aa65471ebf514eebb3cc8c86015954b8688d5e2aaf942f34b16c7ff4d","index":"0x0"},"since":"0x0"}],"outputs":[{"lock":{"codeHash":"0x61ca7a4796a4eb19ca4f0d065cb9b10ddcf002f10f7cbb810c706cb6bb5c3248","hashType":"type","args":"0x010000000000000000000000000000000000000000000000000000000000000000000000"},"type":{"codeHash":"0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb","hashType":"type","args":"0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b"},"capacity":"0x5e9f52f1f"}],"outputsData":["0x00205fa0120000000000000000000000"],"witnesses":["0xFF"]}`,
  // );

  // // Update CKB transaction with the real BTC txId
  // const newCkbRawTx = updateCkbTxWithRealBtcTxId({ ckbRawTx, btcTxId, isMainnet: false });

  // const rgbppApiSpvProof = await service.getRgbppSpvProof(btcTxId, 0);

  // const ckbTx = await appendCkbTxWitnesses({
  //   ckbRawTx: newCkbRawTx,
  //   btcTxBytes,
  //   rgbppApiSpvProof,
  // });

  // console.log(JSON.stringify(ckbTx));

  // const txHash = await sendCkbTx({ collector, signedTx: ckbTx });
  // console.info(`Rgbpp asset has been transferred on BTC and tx hash is ${txHash}`);
};


// Use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
transferRgbppOnBtc({
  rgbppLockArgsList: [buildRgbppLockArgs(1, '70b250e2a3cc7a33b47f7a4e94e41e1ee2501ce73b393d824db1dd4c872c5348')],
  toBtcAddress: 'tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt',
  // To simplify, keep the transferAmount the same as 2-ckb-jump-btc
  transferAmount: BigInt(800_0000_0000),
});

