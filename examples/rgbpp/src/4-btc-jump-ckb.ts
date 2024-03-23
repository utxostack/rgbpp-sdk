import { AddressPrefix, privateKeyToAddress, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import {
  Collector,
  SPVService,
  appendCkbTxWitnesses,
  genBtcJumpCkbVirtualTx,
  sendCkbTx,
  updateCkbTxWithRealBtcTxId,
  buildRgbppLockArgs,
} from '@rgbpp-sdk/ckb';
import {
  sendRgbppUtxos,
  BtcAssetsApi,
  DataSource,
  NetworkType,
  bitcoin,
  ECPair,
  transactionToHex,
} from '@rgbpp-sdk/btc';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
// BTC SECP256K1 private key
const BTC_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
// https://btc-assets-api-develop.vercel.app/docs/static/index.html
const BTC_ASSETS_API_URL = 'https://btc-assets-api-url';
// https://btc-assets-api-develop.vercel.app/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = '';

const SPV_SERVICE_URL = 'https://spv-service-url';

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
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, 'localhost');
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
  let { txid: btcTxId } = await service.sendTransaction(btcTx.toHex());

  console.log('BTC Tx bytes: ', btcTxBytes);
  console.log('BTC TxId: ', btcTxId);

  const newCkbRawTx = updateCkbTxWithRealBtcTxId({ ckbRawTx, btcTxId, isMainnet: false });

  const spvService = new SPVService(SPV_SERVICE_URL);
  // Use an exist BTC transaction id to get the tx proof and the contract will not verify the tx proof now
  btcTxId = '018025fb6989eed484774170eefa2bef1074b0c24537f992a64dbc138277bc4a';
  
  let ckbTx = await appendCkbTxWitnesses({
    ckbRawTx: newCkbRawTx,
    btcTxBytes,
    spvService,
    btcTxIndexInBlock: 0, // ignore spv proof now
    btcTxId,
  });

  const txHash = await sendCkbTx({ collector, signedTx: ckbTx });
  console.info(`gbpp asset has been jumped from BTC to CKB and tx hash is ${txHash}`);
};

// Use your real BTC UTXO information
// rgbppLockArgs: outIndexU32 + btcTxId
jumpFromBtcToCkb({
  // The BTC txId should be same as the btcTxId of 3-btc-transfer.ts
  rgbppLockArgsList: [buildRgbppLockArgs(1, '53e7c02eba522d1e3b0698b4bf5405c25c33b32e7df84a1a6c19e2cf165681f0')],
  toCkbAddress: 'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9kxr7vy7yknezj0vj0xptx6thk6pwyr0sxamv6q',
  // To simplify, keep the transferAmount the same as 2-ckb-jump-btc
  transferAmount: BigInt(800_0000_0000),
});

