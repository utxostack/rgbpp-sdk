import { AddressPrefix, privateKeyToAddress, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genCkbJumpBtcVirtualTx, Collector, getSecp256k1CellDep, buildRgbppLockArgs } from '@rgbpp-sdk/ckb';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

const jumpFromCkbToBtc = async ({ outIndex, btcTxId }: { outIndex: number; btcTxId: string }) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const address = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, { prefix: AddressPrefix.Testnet });
  console.log('ckb address: ', address);

  const toRgbppLockArgs = buildRgbppLockArgs(outIndex, btcTxId);

  const xudtType: CKBComponents.Script = {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  };

  const ckbRawTx = await genCkbJumpBtcVirtualTx({
    collector,
    fromCkbAddress: address,
    toRgbppLockArgs,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount: BigInt(800_0000_0000),
    witnessLockPlaceholderSize: 1000
  });

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  let unsignedTx: CKBComponents.RawTransactionToSign = {
    ...ckbRawTx,
    cellDeps: [...ckbRawTx.cellDeps, getSecp256k1CellDep(false)],
    witnesses: [emptyWitness, ...ckbRawTx.witnesses.slice(1)],
  };

  const signedTx = collector.getCkb().signTransaction(CKB_TEST_PRIVATE_KEY)(unsignedTx);

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  console.info(`Rgbpp asset has been jumped from CKB to BTC and tx hash is ${txHash}`);
};

// Use your real BTC UTXO information on the BTC Testnet
jumpFromCkbToBtc({
  outIndex: 1,
  btcTxId: '4ff1855b64b309afa19a8b9be3d4da99dcb18b083b65d2d851662995c7d99e7a',
});

