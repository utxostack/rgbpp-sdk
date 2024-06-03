import { buildRgbppLockArgs } from 'rgbpp/ckb';
import { genLeapSporeFromBtcToCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import { getSporeTypeScript, Hex } from 'rgbpp/ckb';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { isMainnet, collector, btcAddress, btcDataSource, btcKeyPair, btcService } from '../env';
import { getFastestFeeRate, readStepLog } from '../shared/utils';

interface SporeLeapParams {
  sporeRgbppLockArgs: Hex;
  toCkbAddress: string;
  sporeTypeArgs: Hex;
}

const leapSporeFromBtcToCkb = async ({ sporeRgbppLockArgs, toCkbAddress, sporeTypeArgs }: SporeLeapParams) => {
  const { retry } = await import('zx');
  await retry(20, '10s', async () => {
    const sporeTypeBytes = serializeScript({
      ...getSporeTypeScript(isMainnet),
      args: sporeTypeArgs,
    });

    const feeRate = await getFastestFeeRate();
    console.log('feeRate = ', feeRate);

    const ckbVirtualTxResult = await genLeapSporeFromBtcToCkbVirtualTx({
      collector,
      sporeRgbppLockArgs,
      sporeTypeBytes,
      toCkbAddress,
      isMainnet,
    });

    const { commitment, ckbRawTx, needPaymasterCell } = ckbVirtualTxResult;

    // Send BTC tx
    const psbt = await sendRgbppUtxos({
      ckbVirtualTx: ckbRawTx,
      commitment,
      tos: [btcAddress!],
      needPaymaster: needPaymasterCell,
      ckbCollector: collector,
      from: btcAddress!,
      source: btcDataSource,
      feeRate: feeRate,
    });
    psbt.signAllInputs(btcKeyPair);
    psbt.finalizeAllInputs();

    const btcTx = psbt.extractTransaction();
    const { txid: btcTxId } = await btcService.sendBtcTransaction(btcTx.toHex());

    console.log('BTC TxId: ', btcTxId);
    console.log(`explorer: https://mempool.space/testnet/tx/${btcTxId}`);

    await btcService.sendRgbppCkbTransaction({ btc_txid: btcTxId, ckb_virtual_result: ckbVirtualTxResult });

    try {
      const interval = setInterval(async () => {
        const { state, failedReason } = await btcService.getRgbppTransactionState(btcTxId);
        console.log('state', state);
        if (state === 'completed' || state === 'failed') {
          clearInterval(interval);
          if (state === 'completed') {
            const { txhash: txHash } = await btcService.getRgbppTransactionHash(btcTxId);
            console.info(`Rgbpp spore has been leaped from BTC to CKB and the related CKB tx hash is ${txHash}`);
            console.info(`explorer: https://pudge.explorer.nervos.org/transaction/${txHash}`);
          } else {
            console.warn(`Rgbpp CKB transaction failed and the reason is ${failedReason} `);
          }
        }
      }, 30 * 1000);
    } catch (error) {
      console.error(error);
    }
  });
};

// Please use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
leapSporeFromBtcToCkb({
  sporeRgbppLockArgs: buildRgbppLockArgs(3, readStepLog('5').txid),
  toCkbAddress: 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq0e4xk4rmg5jdkn8aams492a7jlg73ue0gc0ddfj',
  // Please use your own RGB++ spore asset's sporeTypeArgs
  sporeTypeArgs: readStepLog('6')[1].args,
});
