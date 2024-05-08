import { AddressPrefix, privateKeyToAddress, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genCkbJumpBtcVirtualTx } from '../src/rgbpp';
import { Collector } from '../src/collector';
import { u32ToLe } from '../src/utils';
import { getSecp256k1CellDep } from '../src/constants';

// SECP256K1 private key
const LAUNCH_SECP256K1_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

const launchRgbppAsset = async () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const address = privateKeyToAddress(LAUNCH_SECP256K1_PRIVATE_KEY, { prefix: AddressPrefix.Testnet });
  console.log('master address: ', address);

  // TODO: Use real btc utxo information
  const outIndex = 1;
  const btcTxId = '47448104a611ecb16ab8d8e500b2166689612c93fc7ef18783d8189f3079f447';
  const toRgbppLockArgs = `0x${u32ToLe(outIndex)}${btcTxId}`;

  // TODO: Use real XUDT type script
  const xudtType: CKBComponents.Script = {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '0xaafd7e7eab79726c669d7565888b194dc06bd1dbec16749a721462151e4f1762',
  };

  const ckbRawTx = await genCkbJumpBtcVirtualTx({
    collector,
    fromCkbAddress: address,
    toRgbppLockArgs,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount: BigInt(200_0000_0000),
  });

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const unsignedTx: CKBComponents.RawTransactionToSign = {
    ...ckbRawTx,
    cellDeps: [...ckbRawTx.cellDeps, getSecp256k1CellDep(false)],
    witnesses: [emptyWitness, ...ckbRawTx.witnesses.slice(1)],
  };

  const signedTx = collector.getCkb().signTransaction(LAUNCH_SECP256K1_PRIVATE_KEY)(unsignedTx);

  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  console.info(`Rgbpp asset has been jumping from CKB to BTC and tx hash is ${txHash}`);
};

launchRgbppAsset();
