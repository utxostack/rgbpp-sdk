import { bitcoin } from 'rgbpp/btc';
import { buildRgbppTransferAllTxs, sendRgbppTxGroups } from 'rgbpp';
import { btcDataSource, isMainnet, collector, btcAccount } from '../../env';
import { signPsbt } from '../../../../examples/rgbpp/shared/btc-account';
import { saveCkbVirtualTxResult } from '../../../../examples/rgbpp/shared/utils';
import { readStepLog } from '../../shared/utils';

interface TestParams {
  xudtTypeArgs: string;
  fromAddress: string;
  toAddress: string;
}

const rgbppTransferAllTxs = async ({ xudtTypeArgs, fromAddress, toAddress }: TestParams) => {
  const result = await buildRgbppTransferAllTxs({
    ckb: {
      xudtTypeArgs,
      collector,
    },
    btc: {
      assetAddresses: [fromAddress],
      fromAddress: fromAddress,
      toAddress: toAddress,
      dataSource: btcDataSource,
      feeRate: 5,
    },
    isMainnet,
  });

  console.log('result.transactions.length', result.transactions.length);
  console.log('result.summary.included.assets', result.summary.included.xudtAssets);
  console.log('result.summary.excluded.assets', result.summary.excluded.xudtAssets);

  const signedGroups = await Promise.all(
    result.transactions.map(async (group) => {
      const psbt = bitcoin.Psbt.fromHex(group.btc.psbtHex);

      // Sign transactions
      signPsbt(psbt, btcAccount);

      psbt.finalizeAllInputs();

      return {
        ckbVirtualTxResult: JSON.stringify(group.ckb.virtualTxResult),
        btcTxHex: psbt.extractTransaction().toHex(),
      };
    }),
  );

  const signedGroupsData = JSON.parse(JSON.stringify(signedGroups, null, 2));

  // Save signedGroupsData
  saveCkbVirtualTxResult(signedGroupsData, '1-btc-transfer-all');

  console.log('signedGroups', signedGroupsData);

  // Send transactions
  const sentGroups = await sendRgbppTxGroups({
    txGroups: signedGroups,
    btcService: btcDataSource.service,
  });
  console.log('sentGroups', JSON.stringify(sentGroups, null, 2));

  const successfulTxIds = sentGroups
    .filter((group) => group.btcTxId)
    .map((group) => `https://mempool.space/testnet/tx/${group.btcTxId}`);

  console.log('Successful Transactions:', successfulTxIds.join('\n'));

  try {
    for (const group of sentGroups) {
      if (group.btcTxId) {
        const btcTxId = group.btcTxId;

        const interval = setInterval(async () => {
          try {
            const { state, failedReason } = await btcDataSource.service.getRgbppTransactionState(btcTxId);
            console.log(`State for transaction ${btcTxId}: ${state}`);
            if (state === 'completed' || state === 'failed') {
              clearInterval(interval);
              if (state === 'completed') {
                const { txhash: txHash } = await btcDataSource.service.getRgbppTransactionHash(btcTxId);
                console.info(`Rgbpp asset has been transferred on BTC and the related CKB tx hash is ${txHash}`);
                console.info(`Explorer: https://pudge.explorer.nervos.org/transaction/${txHash}`);
              } else {
                console.warn(`Rgbpp CKB transaction failed and the reason is ${failedReason}`);
              }
            }
          } catch (error) {
            console.error(`Error checking state for transaction ${btcTxId}:`, error);
          }
        }, 30 * 1000);
      }
    }
  } catch (error) {
    console.error('Error during transaction state tracking:', error);
  }
};

rgbppTransferAllTxs({
  // Please use your own RGB++ xudt asset's xudtTypeArgs
  xudtTypeArgs: readStepLog('xUDT-type-script').args,
  fromAddress: btcAccount.from,
  toAddress: 'tb1qdnvvnyhc5wegxgh0udwaej04n8w08ahrr0w4q9',
}).catch(console.error);
