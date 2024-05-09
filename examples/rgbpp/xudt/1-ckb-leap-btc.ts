import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genCkbJumpBtcVirtualTx, getSecp256k1CellDep, buildRgbppLockArgs, getXudtTypeScript } from '@rgbpp-sdk/ckb';
import { CKB_PRIVATE_KEY, isMainnet, collector, ckbAddress } from '../utils';

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
  });

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const unsignedTx: CKBComponents.RawTransactionToSign = {
    ...ckbRawTx,
    cellDeps: [...ckbRawTx.cellDeps, getSecp256k1CellDep(false)],
    witnesses: [emptyWitness, ...ckbRawTx.witnesses.slice(1)],
  };

  const signedTx = collector.getCkb().signTransaction(CKB_PRIVATE_KEY)(unsignedTx);

  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  console.info(`Rgbpp asset has been jumped from CKB to BTC and tx hash is ${txHash}`);
};

// Use your real BTC UTXO information on the BTC Testnet
leapFromCkbToBtc({
  outIndex: 1,
  btcTxId: '4ff1855b64b309afa19a8b9be3d4da99dcb18b083b65d2d851662995c7d99e7a',
  xudtTypeArgs: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  transferAmount: BigInt(800_0000_0000),
});
