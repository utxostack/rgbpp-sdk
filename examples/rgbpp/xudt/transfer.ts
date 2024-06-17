import { sendBtc } from 'rgbpp';
import { btcAccount, btcDataSource, btcService } from '../env';
import { signAndSendPsbt } from '../shared/btc-account';

const run = async () => {
  const psbt = await sendBtc({
    from: btcAccount.from,
    tos: [{ address: 'tb1qs4n7d4c7n242uyw26gcwvmurhnrt2he84zk2cr', value: 3000 }],
    source: btcDataSource,
  });

  const { txId: btcTxId } = await signAndSendPsbt(psbt, btcAccount, btcService);
  console.log(`BTC TxId: ${btcTxId}`);
};

run();
