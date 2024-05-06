import { sendBtc } from '@rgbpp-sdk/btc';
import { BtcAssetsApiError } from '@rgbpp-sdk/service';
import { getDeployVariables, getFastestFeeRate, writeStepLog } from './shared/utils';
import { describe, it } from 'vitest';

const prepareUtxoTest = async () => {
  const { source, btcAddress, btcKeyPair, service } = getDeployVariables();
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
    source,
  });

  // Sign & finalize inputs
  psbt.signAllInputs(btcKeyPair);
  psbt.finalizeAllInputs();

  // Broadcast transaction
  const tx = psbt.extractTransaction();
  console.log(tx.toHex());


  const { txid: btcTxId } = await service.sendBtcTransaction(tx.toHex());
  console.log('btcTxId = ', btcTxId);

  writeStepLog('0', {
    txid: btcTxId,
    index: 0,
  });
  const interval = setInterval(async () => {
    try {
      console.log('Waiting for BTC tx to be confirmed');
      const tx = await service.getBtcTransaction(btcTxId);
      if (tx.status.confirmed) {
        clearInterval(interval);
        console.info(`Utxo is confirmed ${btcTxId}:0`);
      }
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  });
};

describe('prepare-utxo', () => {
  it('prepare-utxo.test', async () => {
    await prepareUtxoTest();
  }, 500000);
});
