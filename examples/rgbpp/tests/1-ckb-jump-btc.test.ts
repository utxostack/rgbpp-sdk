import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { buildRgbppLockArgs, genCkbJumpBtcVirtualTx, getSecp256k1CellDep } from '@rgbpp-sdk/ckb';
import { getDeployVariables, readStepLog } from './shared/utils';
import { describe, it } from 'vitest';

const jumpFromCkbToBtc = async ({ outIndex, btcTxId }: { outIndex: number; btcTxId: string }) => {
  await new Promise(resolve => setTimeout(resolve, 90 * 1000));
  const { collector, ckbAddress } = getDeployVariables();

  const toRgbppLockArgs = buildRgbppLockArgs(outIndex, btcTxId);

  const xudtType: CKBComponents.Script = {
    codeHash: readStepLog('1').codeHash,
    hashType: readStepLog('1').hashType,
    args: readStepLog('1').args,
  };

  const ckbRawTx = await genCkbJumpBtcVirtualTx({
    collector,
    fromCkbAddress: ckbAddress,
    toRgbppLockArgs,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount: BigInt(800_0000_0000),
    witnessLockPlaceholderSize: 1000,
  });

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const unsignedTx: CKBComponents.RawTransactionToSign = {
    ...ckbRawTx,
    cellDeps: [...ckbRawTx.cellDeps, getSecp256k1CellDep(false)],
    witnesses: [emptyWitness, ...ckbRawTx.witnesses.slice(1)],
  };

  const signedTx = collector.getCkb().signTransaction(process.env.CKB_PRIVATE_KEY)(unsignedTx);

  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

  if (!txHash) {
    throw new Error('Transaction hash is empty. Failed to jump RGBPP asset from CKB to BTC.');
  }

  console.info(`Rgbpp asset has been jumped from CKB to BTC and tx hash is ${txHash}`);
};

describe('ckb-jump-btc', () => {
  it('1-ckb-jump-btc.test', async () => {
    await jumpFromCkbToBtc({
      outIndex: readStepLog('0').index,
      btcTxId: readStepLog('0').txid,
    });
  }, 500000);
});
