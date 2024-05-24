import { buildRgbppLockArgs } from 'rgbpp/ckb';
import { genLeapSporeFromBtcToCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import { getSporeTypeScript, Hex } from 'rgbpp/ckb';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { isMainnet, collector, btcAddress, btcDataSource, btcKeyPair, btcService } from '../env';
import { saveCkbVirtualTxResult } from '../shared/utils';

interface SporeLeapParams {
  sporeRgbppLockArgs: Hex;
  toCkbAddress: string;
  sporeTypeArgs: Hex;
}

const leapSporeFromBtcToCkb = async ({ sporeRgbppLockArgs, toCkbAddress, sporeTypeArgs }: SporeLeapParams) => {
  const sporeTypeBytes = serializeScript({
    ...getSporeTypeScript(isMainnet),
    args: sporeTypeArgs,
  });

  const ckbVirtualTxResult = await genLeapSporeFromBtcToCkbVirtualTx({
    collector,
    sporeRgbppLockArgs,
    sporeTypeBytes,
    toCkbAddress,
    isMainnet,
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '5-leap-spore-to-ckb');

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [btcAddress!],
    ckbCollector: collector,
    from: btcAddress!,
    source: btcDataSource,
    feeRate: 30,
  });
  psbt.signAllInputs(btcKeyPair);
  psbt.finalizeAllInputs();

  const btcTx = psbt.extractTransaction();
  const { txid: btcTxId } = await btcService.sendBtcTransaction(btcTx.toHex());

  console.log('BTC TxId: ', btcTxId);

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
        } else {
          console.warn(`Rgbpp CKB transaction failed and the reason is ${failedReason} `);
        }
      }
    }, 30 * 1000);
  } catch (error) {
    console.error(error);
  }
};

// Use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
leapSporeFromBtcToCkb({
  sporeRgbppLockArgs: buildRgbppLockArgs(3, 'd8a31796fbd42c546f6b22014b9b82b16586ce1df81b0e7ca9a552cdc492a0af'),
  toCkbAddress: 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq0e4xk4rmg5jdkn8aams492a7jlg73ue0gc0ddfj',
  sporeTypeArgs: '0x42898ea77062256f46e8f1b861d526ae47810ecc51ab50477945d5fa90452706',
});
