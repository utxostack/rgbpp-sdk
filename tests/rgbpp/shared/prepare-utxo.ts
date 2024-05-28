import { sendBtc } from 'rgbpp/btc';
import { getFastestFeeRate, writeStepLog } from './utils';
import { BtcAssetsApiError } from 'rgbpp/service';
import { btcAddress, btcDataSource, btcKeyPair, btcService } from '../env';

const prepareUtxo = async () => {
  const feeRate = await getFastestFeeRate();
  console.log('feeRate = ', feeRate);
  console.log(btcAddress);

  // Send BTC tx
  const psbt = await sendBtc({
    from: btcAddress!,
    tos: [
      {
        address: btcAddress!,
        value: 546,
        minUtxoSatoshi: 546,
      },
    ],
    feeRate: feeRate,
    source: btcDataSource,
  });

  // Sign & finalize inputs
  psbt.signAllInputs(btcKeyPair);
  psbt.finalizeAllInputs();

  // Broadcast transaction
  const tx = psbt.extractTransaction();
  console.log(tx.toHex());

  const { txid: btcTxId } = await btcService.sendBtcTransaction(tx.toHex());
  console.log(`explorer: https://mempool.space/testnet/tx/${btcTxId}`);

  writeStepLog('0', {
    txid: btcTxId,
    index: 0,
  });

  const interval = setInterval(async () => {
    try {
      console.log('Waiting for BTC tx to be confirmed');
      const tx = await btcService.getBtcTransaction(btcTxId);
      if (tx.status.confirmed) {
        clearInterval(interval);
        console.info(`Utxo is confirmed ${btcTxId}:0`);
      }
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 20 * 1000);
};

prepareUtxo();
