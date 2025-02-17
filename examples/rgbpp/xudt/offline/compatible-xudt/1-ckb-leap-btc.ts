import { addressToScript, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genCkbJumpBtcVirtualTx } from 'rgbpp';
import { getSecp256k1CellDep, buildRgbppLockArgs, signCkbTransaction } from 'rgbpp/ckb';
import {
  CKB_PRIVATE_KEY,
  isMainnet,
  collector,
  ckbAddress,
  BTC_TESTNET_TYPE,
  initOfflineCkbCollector,
  vendorCellDeps,
} from '../../../env';

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

  const { collector: offlineCollector } = await initOfflineCkbCollector([
    { lock: addressToScript(ckbAddress), type: compatibleXudtTypeScript },
    { lock: addressToScript(ckbAddress) },
  ]);

  const ckbRawTx = await genCkbJumpBtcVirtualTx({
    collector: offlineCollector,
    fromCkbAddress: ckbAddress,
    toRgbppLockArgs,
    xudtTypeBytes: serializeScript(compatibleXudtTypeScript),
    transferAmount,
    btcTestnetType: BTC_TESTNET_TYPE,
    vendorCellDeps,
  });

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const unsignedTx: CKBComponents.RawTransactionToSign = {
    ...ckbRawTx,
    cellDeps: [...ckbRawTx.cellDeps, getSecp256k1CellDep(isMainnet)],
    witnesses: [emptyWitness, ...ckbRawTx.witnesses.slice(1)],
  };

  const signedTx = signCkbTransaction(CKB_PRIVATE_KEY, unsignedTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  console.info(`Rgbpp compatible xUDT asset has been leaped from CKB to BTC and CKB tx hash is ${txHash}`);
};

// Please use your real BTC UTXO information on the BTC Testnet
// BTC Testnet3: https://mempool.space/testnet
// BTC Signet: https://mempool.space/signet
leapRusdFromCkbToBtc({
  outIndex: 2,
  btcTxId: '4239d2f9fe566513b0604e4dfe10f3b85b6bebe25096cf426559a89c87c68d1a',
  compatibleXudtTypeScript: {
    codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
    hashType: 'type',
    args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
  },
  transferAmount: BigInt(200_0000),
});

/* 
npx tsx examples/rgbpp/xudt/offline/compatible-xudt/1-ckb-leap-btc.ts
*/
