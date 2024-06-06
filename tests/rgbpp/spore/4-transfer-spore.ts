import { buildRgbppLockArgs } from 'rgbpp/ckb';
import { genTransferSporeCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import { getSporeTypeScript, Hex } from 'rgbpp/ckb';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { isMainnet, collector, btcAddress, btcDataSource, btcKeyPair, btcService } from '../env';
import { getFastestFeeRate, readStepLog } from '../shared/utils';
import { saveCkbVirtualTxResult } from '../../../examples/rgbpp/shared/utils';

interface SporeTransferParams {
  sporeRgbppLockArgs: Hex;
  toBtcAddress: string;
  sporeTypeArgs: Hex;
}

const transferSpore = async ({ sporeRgbppLockArgs, toBtcAddress, sporeTypeArgs }: SporeTransferParams) => {
  const { retry } = await import('zx');
  await retry(20, '10s', async () => {
    const sporeTypeBytes = serializeScript({
      ...getSporeTypeScript(isMainnet),
      args: sporeTypeArgs,
    });

    const feeRate = await getFastestFeeRate();
    console.log('feeRate = ', feeRate);

    const ckbVirtualTxResult = await genTransferSporeCkbVirtualTx({
      collector,
      sporeRgbppLockArgs,
      sporeTypeBytes,
      isMainnet,
    });

    // Save ckbVirtualTxResult
    saveCkbVirtualTxResult(ckbVirtualTxResult, '4-transfer-spore');

    const { commitment, ckbRawTx, needPaymasterCell } = ckbVirtualTxResult;

    // Send BTC tx
    const psbt = await sendRgbppUtxos({
      ckbVirtualTx: ckbRawTx,
      commitment,
      tos: [toBtcAddress],
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
            console.info(`Rgbpp spore has been transferred on BTC and the related CKB tx hash is ${txHash}`);
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
transferSpore({
  sporeRgbppLockArgs: buildRgbppLockArgs(2, readStepLog('5').txid),
  toBtcAddress: 'tb1qhp9fh9qsfeyh0yhewgu27ndqhs5qlrqwau28m7',
  // Please use your own RGB++ spore asset's sporeTypeArgs
  sporeTypeArgs: readStepLog('6')[0].args,
});
