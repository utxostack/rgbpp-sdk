import { AddressPrefix, privateKeyToAddress, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import {
  Collector,
  getSecp256k1CellDep,
  buildRgbppLockArgs,
  getSporeTypeScript,
  genLeapSporeFromCkbToBtcRawTx,
} from '@rgbpp-sdk/ckb';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

const leapSporeFromCkbToBtc = async ({ outIndex, btcTxId }: { outIndex: number; btcTxId: string }) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const isMainnet = false;
  const address = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, {
    prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
  });
  console.log('ckb address: ', address);

  const toRgbppLockArgs = buildRgbppLockArgs(outIndex, btcTxId);

  const sporeType: CKBComponents.Script = {
    ...getSporeTypeScript(isMainnet),
    args: '0x42898ea77062256f46e8f1b861d526ae47810ecc51ab50477945d5fa90452706',
  };

  const ckbRawTx = await genLeapSporeFromCkbToBtcRawTx({
    collector,
    fromCkbAddress: address,
    toRgbppLockArgs,
    sporeTypeBytes: serializeScript(sporeType),
    isMainnet,
  });

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const unsignedTx: CKBComponents.RawTransactionToSign = {
    ...ckbRawTx,
    cellDeps: [...ckbRawTx.cellDeps, getSecp256k1CellDep(isMainnet)],
    witnesses: [emptyWitness, ...ckbRawTx.witnesses.slice(1)],
  };

  const signedTx = collector.getCkb().signTransaction(CKB_TEST_PRIVATE_KEY)(unsignedTx);

  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  console.info(`RGB++ Spore has been jumped from CKB to BTC and tx hash is ${txHash}`);
};

// Use your real BTC UTXO information on the BTC Testnet
leapSporeFromCkbToBtc({
  outIndex: 1,
  btcTxId: '448897515cf07b4ca0cd38af9806399ede55775b4c760b274ed2322121ed185f',
});
