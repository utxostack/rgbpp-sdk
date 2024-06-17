import { sendBtc } from 'rgbpp/btc';
import { writeStepLog } from './utils';
import { BtcAssetsApiError } from 'rgbpp/service';
import { btcAccount, btcDataSource, btcKeyPair, btcService } from '../env';

const prepareUtxo = async (index: string | number) => {
  console.log(btcAccount.from);

  // Send BTC tx
  const psbt = await sendBtc({
    from: btcAccount.from!,
    tos: [
      {
        address: btcAccount.from!,
        value: 546,
        minUtxoSatoshi: 546,
      },
    ],
    feeRate: 1,
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

  writeStepLog(String(index), {
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

prepareUtxo('prepare-utxo');
