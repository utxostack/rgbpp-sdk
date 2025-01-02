import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genCkbJumpBtcVirtualTx } from 'rgbpp';
import { getSecp256k1CellDep, buildRgbppLockArgs } from 'rgbpp/ckb';
import { CKB_PRIVATE_KEY, isMainnet, collector, ckbAddress, BTC_TESTNET_TYPE } from '../../env';

interface LeapToBtcParams {
  outIndex: number;
  btcTxId: string;
  transferAmount: bigint;
  compatibleXudtTypeScript: CKBComponents.Script;
}

const leapRusdFromCkbToBtc = async ({
  outIndex,
  btcTxId,
  transferAmount,
  compatibleXudtTypeScript,
}: LeapToBtcParams) => {
  const toRgbppLockArgs = buildRgbppLockArgs(outIndex, btcTxId);

  const ckbRawTx = await genCkbJumpBtcVirtualTx({
    collector,
    fromCkbAddress: ckbAddress,
    toRgbppLockArgs,
    xudtTypeBytes: serializeScript(compatibleXudtTypeScript),
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
  console.info(`Rgbpp compatible xUDT asset has been leaped from CKB to BTC and CKB tx hash is ${txHash}`);
};

// Please use your real BTC UTXO information on the BTC Testnet
// BTC Testnet3: https://mempool.space/testnet
// BTC Signet: https://mempool.space/signet
leapRusdFromCkbToBtc({
  outIndex: 4,
  btcTxId: '44de1b4e3ddaa95cc85cc8b1c60f3e439d343002f0c60980fb4c70841ee0c75e',
  // Please use your own RGB++ compatible xUDT asset's type script
  compatibleXudtTypeScript: {
    codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
    hashType: 'type',
    args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
  },
  transferAmount: BigInt(1000_0000),
});
