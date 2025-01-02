import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genCkbJumpBtcVirtualTx } from 'rgbpp';
import { getSecp256k1CellDep, buildRgbppLockArgs } from 'rgbpp/ckb';
import { CKB_PRIVATE_KEY, isMainnet, collector, ckbAddress, BTC_TESTNET_TYPE } from '../../env';
import { readStepLog } from '../../shared/utils';

interface LeapToBtcParams {
  outIndex: number;
  btcTxId: string;
  compatibleXudtTypeScript: CKBComponents.Script;
  transferAmount: bigint;
}

const leapFromCkbToBtc = async ({ outIndex, btcTxId, compatibleXudtTypeScript, transferAmount }: LeapToBtcParams) => {
  const { retry } = await import('zx');
  await retry(20, '10s', async () => {
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
    console.info(`Rgbpp compatible xUDT asset has been jumped from CKB to BTC and CKB tx hash is ${txHash}`);
    console.info(`explorer: https://pudge.explorer.nervos.org/transaction/${txHash}`);
  });
};

// Use your real BTC UTXO information on the BTC Testnet
leapFromCkbToBtc({
  outIndex: readStepLog('prepare-utxo').index,
  btcTxId: readStepLog('prepare-utxo').txid,
  compatibleXudtTypeScript: {
    codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
    hashType: 'type',
    args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
  },
  transferAmount: BigInt(100_0000),
});
