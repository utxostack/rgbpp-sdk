import { buildRgbppLockArgs } from 'rgbpp/ckb';
import { buildRgbppTransferTx } from 'rgbpp';
import { isMainnet, collector, btcService, btcDataSource, BTC_TESTNET_TYPE, btcAccount } from '../../env';
import { getFastestFeeRate, readStepLog, writeStepLog } from '../../shared/utils';
import { saveCkbVirtualTxResult } from '../../../../examples/rgbpp/shared/utils';
import { bitcoin } from 'rgbpp/btc';
import { signAndSendPsbt } from '../../../../examples/rgbpp/shared/btc-account';

interface RgbppTransferParams {
  rgbppLockArgsList: string[];
  toBtcAddress: string;
  compatibleXudtTypeScript: CKBComponents.Script;
  transferAmount: bigint;
}

const transfer = async ({
  rgbppLockArgsList,
  toBtcAddress,
  compatibleXudtTypeScript,
  transferAmount,
}: RgbppTransferParams) => {
  const { retry } = await import('zx');

  const feeRate = await getFastestFeeRate();
  console.log('feeRate = ', feeRate);

  await retry(120, '10s', async () => {
    const { ckbVirtualTxResult, btcPsbtHex } = await buildRgbppTransferTx({
      ckb: {
        collector,
        xudtTypeArgs: compatibleXudtTypeScript.args,
        rgbppLockArgsList,
        transferAmount,
        compatibleXudtTypeScript,
      },
      btc: {
        fromAddress: btcAccount.from,
        toAddress: toBtcAddress,
        fromPubkey: btcAccount.fromPubkey,
        dataSource: btcDataSource,
        testnetType: BTC_TESTNET_TYPE,
        feeRate: feeRate,
      },
      isMainnet,
    });

    // Save ckbVirtualTxResult
    saveCkbVirtualTxResult(ckbVirtualTxResult, '2-btc-transfer');

    // Send BTC tx
    const psbt = bitcoin.Psbt.fromHex(btcPsbtHex);
    const { txId: btcTxId } = await signAndSendPsbt(psbt, btcAccount, btcService);
    console.log(`BTC ${BTC_TESTNET_TYPE} TxId: ${btcTxId}`);
    console.log(`explorer: https://mempool.space/testnet/tx/${btcTxId}`);

    writeStepLog('transfer-id', {
      txid: btcTxId,
      index: 1,
    });

    await btcService.sendRgbppCkbTransaction({ btc_txid: btcTxId, ckb_virtual_result: ckbVirtualTxResult });

    try {
      const interval = setInterval(async () => {
        const { state, failedReason } = await btcService.getRgbppTransactionState(btcTxId);
        console.log('state', state);
        if (state === 'completed' || state === 'failed') {
          clearInterval(interval);
          if (state === 'completed') {
            const { txhash: txHash } = await btcService.getRgbppTransactionHash(btcTxId);
            console.info(
              `Rgbpp compatible xUDT asset has been transferred on BTC and the related CKB tx hash is ${txHash}`,
            );
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

// Use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
transfer({
  rgbppLockArgsList: [buildRgbppLockArgs(readStepLog('prepare-utxo').index, readStepLog('prepare-utxo').txid)],
  toBtcAddress: 'tb1q6jf0qguvjz65e4xxdvsltugf4d673hh8nj32gq',
  compatibleXudtTypeScript: {
    codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
    hashType: 'type',
    args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
  },
  transferAmount: BigInt(100_0000),
});
