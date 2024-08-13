import { bitcoin } from 'rgbpp/btc';
import { buildRgbppTransferAllTxs, sendRgbppTxGroups } from 'rgbpp';
import { btcDataSource, isMainnet, collector, btcAccount } from '../../env';
import { signPsbt } from '../../shared/btc-account';
import { saveCkbVirtualTxResult } from '../../shared/utils';

interface TestParams {
  xudtTypeArgs: string;
  fromAddress: string;
  toAddress: string;
}
const SEND_TX_GROUPS = false;

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
      await signPsbt(psbt, btcAccount);

      psbt.finalizeAllInputs();
      psbt.extractTransaction();

      return {
        ckbVirtualTxResult: JSON.stringify(group.ckb.virtualTxResult),
        btcTxHex: psbt.extractTransaction().toHex(),
      };
    }),
  );

  const ckbVirtualTxResult = JSON.parse(JSON.stringify(signedGroups, null, 2));

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '1-btc-transfer-all');

  console.log('signedGroups', ckbVirtualTxResult);

  if (!SEND_TX_GROUPS) {
    return;
  }

  // Send transactions
  const sentGroups = await sendRgbppTxGroups({
    txGroups: signedGroups,
    btcService: btcDataSource.service,
  });
  console.log('sentGroups', JSON.stringify(sentGroups, null, 2));
};

rgbppTransferAllTxs({
  // Please use your own RGB++ xudt asset's xudtTypeArgs
  xudtTypeArgs: '0xdec25e81ad1d5b909926265b0cdf404e270250b9885d436852b942d56d06be38',
  fromAddress: btcAccount.from,
  toAddress: 'tb1qdnvvnyhc5wegxgh0udwaej04n8w08ahrr0w4q9',
}).catch(console.error);
