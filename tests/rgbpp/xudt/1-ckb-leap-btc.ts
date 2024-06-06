import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genCkbJumpBtcVirtualTx } from 'rgbpp';
import { getSecp256k1CellDep, buildRgbppLockArgs, getXudtTypeScript } from 'rgbpp/ckb';
import { CKB_PRIVATE_KEY, isMainnet, collector, ckbAddress } from '../env';
import { readStepLog } from '../shared/utils';

interface LeapToBtcParams {
  outIndex: number;
  btcTxId: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

const leapFromCkbToBtc = async ({ outIndex, btcTxId, xudtTypeArgs, transferAmount }: LeapToBtcParams) => {
  const { retry } = await import('zx');
  await retry(20, '10s', async () => {
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
    console.info(`explorer: https://pudge.explorer.nervos.org/transaction/${txHash}`);
  });
};

// Use your real BTC UTXO information on the BTC Testnet
leapFromCkbToBtc({
  outIndex: readStepLog('prepare-utxo').index,
  btcTxId: readStepLog('prepare-utxo').txid,
  xudtTypeArgs: readStepLog('xUDT-type-script').args,
  transferAmount: BigInt(800_0000_0000),
});
