import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genLeapSporeFromCkbToBtcRawTx } from 'rgbpp';
import { isMainnet, collector, ckbAddress, CKB_PRIVATE_KEY } from '../env';
import { buildRgbppLockArgs, getSecp256k1CellDep, getSporeTypeScript } from 'rgbpp/ckb';

const leapSporeFromCkbToBtc = async ({
  outIndex,
  btcTxId,
  sporeTypeArgs,
}: {
  outIndex: number;
  btcTxId: string;
  sporeTypeArgs: string;
}) => {
  const toRgbppLockArgs = buildRgbppLockArgs(outIndex, btcTxId);

  const sporeType: CKBComponents.Script = {
    ...getSporeTypeScript(isMainnet),
    args: sporeTypeArgs,
  };

  const ckbRawTx = await genLeapSporeFromCkbToBtcRawTx({
    collector,
    fromCkbAddress: ckbAddress,
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

  const signedTx = collector.getCkb().signTransaction(CKB_PRIVATE_KEY)(unsignedTx);

  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  console.info(`RGB++ Spore has been jumped from CKB to BTC and tx hash is ${txHash}`);
};

// Use your real BTC UTXO information on the BTC Testnet
leapSporeFromCkbToBtc({
  outIndex: 1,
  btcTxId: '448897515cf07b4ca0cd38af9806399ede55775b4c760b274ed2322121ed185f',
  sporeTypeArgs: '0x42898ea77062256f46e8f1b861d526ae47810ecc51ab50477945d5fa90452706',
});
