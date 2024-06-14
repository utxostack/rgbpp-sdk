import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genCkbJumpBtcVirtualTx } from 'rgbpp';
import { getSecp256k1CellDep, buildRgbppLockArgs, getXudtTypeScript } from 'rgbpp/ckb';
import { CKB_PRIVATE_KEY, isMainnet, collector, ckbAddress, BTC_TESTNET_TYPE } from '../env';

interface LeapToBtcParams {
  outIndex: number;
  btcTxId: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

const leapFromCkbToBtc = async ({ outIndex, btcTxId, xudtTypeArgs, transferAmount }: LeapToBtcParams) => {
  const toRgbppLockArgs = buildRgbppLockArgs(outIndex, btcTxId);

  // Warning: Please replace with your real xUDT type script here
  const xudtType: CKBComponents.Script = {
    ...getXudtTypeScript(isMainnet),
    args: xudtTypeArgs,
  };

  const ckbRawTx = await genCkbJumpBtcVirtualTx({
    collector,
    fromCkbAddress: ckbAddress,
    toRgbppLockArgs,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount,
    btcTestnetType: BTC_TESTNET_TYPE,
  });

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const unsignedTx: CKBComponents.RawTransactionToSign = {
    ...ckbRawTx,
    cellDeps: [...ckbRawTx.cellDeps, getSecp256k1CellDep(isMainnet)],
    witnesses: [emptyWitness, ...ckbRawTx.witnesses.slice(1)],
  };

  const signedTx = collector.getCkb().signTransaction(CKB_PRIVATE_KEY)(unsignedTx);

  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  console.info(`Rgbpp asset has been jumped from CKB to BTC and CKB tx hash is ${txHash}`);
};

// Please use your real BTC UTXO information on the BTC Testnet
// BTC Testnet3: https://mempool.space/testnet
// BTC Signet: https://mempool.space/signet
leapFromCkbToBtc({
  outIndex: 1,
  btcTxId: '3f6db9a387587006cb2fa8c6352bc728984bf39cb010789dffe574f27775a6ac',
  // Please use your own RGB++ xudt asset's xudtTypeArgs
  xudtTypeArgs: '0x562e4e8a2f64a3e9c24beb4b7dd002d0ad3b842d0cc77924328e36ad114e3ebe',
  transferAmount: BigInt(800_0000_0000),
});
