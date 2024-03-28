import { AddressPrefix, privateKeyToAddress, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import {
  Collector,
  appendCkbTxWitnesses,
  genBtcJumpCkbVirtualTx,
  sendCkbTx,
  updateCkbTxWithRealBtcTxId,
  buildRgbppLockArgs,
} from '@rgbpp-sdk/ckb';
import {
  sendRgbppUtxos,
  DataSource,
  NetworkType,
  bitcoin,
  ECPair,
  transactionToHex,
} from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service'

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
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, 'https://btc-test.app');
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
  // Remove the witness from BTC tx for RGBPP unlock
  const btcTxBytes = transactionToHex(btcTx, false);
  const { txid: btcTxId } = await service.sendBtcTransaction(btcTx.toHex());

  console.log('BTC Tx bytes: ', btcTxBytes);
  console.log('BTC TxId: ', btcTxId);
  console.log('ckbRawTx', JSON.stringify(ckbRawTx));

  /*****************************************************************************************************************/
  // Warning: Please wait for the btc transaction to be confirmed, and use the above printed data to assign values to the following three variables
  // and delete the following annotations

  // const btcTxId = 'ede749ecee5e607e761e4fffb6d754799498056872456a7d33abe426d7b9951c';
  // const btcTxBytes =
  //   '020000000115a7fbbda80c32da1add29538da1627411c740bbbc907a273add56914122e6240100000000ffffffff020000000000000000226a207f1b052bca06997651c36fae885dd7e4cb25606ccaa970703952995f427bc43284310f000000000016001462fc12a35b779f0cf7edcb9690be19b0386e0f9a00000000';
  // const ckbRawTx = JSON.parse(
  //   `{"version":"0x0","cellDeps":[{"outPoint":{"txHash":"0xf1de59e973b85791ec32debbba08dff80c63197e895eb95d67fc1e9f6b413e00","index":"0x0"},"depType":"code"},{"outPoint":{"txHash":"0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f","index":"0x0"},"depType":"code"},{"outPoint":{"txHash":"0xf1de59e973b85791ec32debbba08dff80c63197e895eb95d67fc1e9f6b413e00","index":"0x1"},"depType":"code"}],"headerDeps":[],"inputs":[{"previousOutput":{"txHash":"0x917c25c087a055b68b6d58b8f7c8925f81a86a11a4773983a185f852b1d1d7cb","index":"0x0"},"since":"0x0"}],"outputs":[{"lock":{"codeHash":"0x00cdf8fab0f8ac638758ebf5ea5e4052b1d71e8a77b9f43139718621f6849326","hashType":"type","args":"0x7f000000100000005b0000005f0000004b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac011600000000016c61f984f12d3c8a4f649e60acda5deda0b8837c060000000000000000000000000000000000000000000000000000000000000000000000"},"type":{"codeHash":"0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb","hashType":"type","args":"0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b"},"capacity":"0x5e9f51fda"}],"outputsData":["0x00205fa0120000000000000000000000"],"witnesses":["0xFF"]}`,
  // );

  // const newCkbRawTx = updateCkbTxWithRealBtcTxId({ ckbRawTx, btcTxId, isMainnet: false });

  // const rgbppApiSpvProof = await service.getRgbppSpvProof(btcTxId, 0);

  // const ckbTx = await appendCkbTxWitnesses({
  //   ckbRawTx: newCkbRawTx,
  //   btcTxBytes,
  //   rgbppApiSpvProof,
  // });

  // console.log('BTC time lock args: ', newCkbRawTx.outputs[0].lock.args);

  // const txHash = await sendCkbTx({ collector, signedTx: ckbTx });
  // console.info(`Rgbpp asset has been jumped from BTC to CKB and tx hash is ${txHash}`);
};

// rgbppLockArgs: outIndexU32 + btcTxId
jumpFromBtcToCkb({
  // If the `3-btc-transfer.ts` has been executed, the BTC txId should be the new generated BTC txId by the `3-btc-transfer.ts`
  // Otherwise the BTC txId should be same as the the BTC txId of the `2-ckb-jump-btc.ts`
  rgbppLockArgsList: [buildRgbppLockArgs(1, '24e622419156dd3a277a90bcbb40c7117462a18d5329dd1ada320ca8bdfba715')],
  toCkbAddress: 'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9kxr7vy7yknezj0vj0xptx6thk6pwyr0sxamv6q',
  // To simplify, keep the transferAmount the same as 2-ckb-jump-btc
  transferAmount: BigInt(800_0000_0000),
});

