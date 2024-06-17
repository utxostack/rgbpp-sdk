import { buildRgbppLockArgs } from 'rgbpp/ckb';
import { buildRgbppTransferTx } from 'rgbpp';
import { isMainnet, collector, btcService, btcDataSource } from '../env';
import { readStepLog, writeStepLog } from '../shared/utils';
import { BTC_TESTNET_TYPE, btcAccount } from '../env';
import { saveCkbVirtualTxResult } from '../../../examples/rgbpp/shared/utils';
import { bitcoin } from 'rgbpp/btc';
import { signAndSendPsbt } from '../../../examples/rgbpp/shared/btc-account';

interface RgbppTransferParams {
  rgbppLockArgsList: string[];
  toBtcAddress: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

const transfer = async ({ rgbppLockArgsList, toBtcAddress, xudtTypeArgs, transferAmount }: RgbppTransferParams) => {
  const { retry } = await import('zx');
  await retry(120, '10s', async () => {
    const { ckbVirtualTxResult, btcPsbtHex } = await buildRgbppTransferTx({
      ckb: {
        collector,
        xudtTypeArgs,
        rgbppLockArgsList,
        transferAmount,
      },
      btc: {
        fromAddress: btcAccount.from,
        toAddress: toBtcAddress,
        fromPubkey: btcAccount.fromPubkey,
        dataSource: btcDataSource,
        testnetType: BTC_TESTNET_TYPE,
        feeRate: 1,
      },
      isMainnet,
    });

    // Save ckbVirtualTxResult
    saveCkbVirtualTxResult(ckbVirtualTxResult, '2-btc-transfer');

    // Send BTC tx
    const psbt = bitcoin.Psbt.fromHex(btcPsbtHex);
    const { txId: btcTxId } = await signAndSendPsbt(psbt, btcAccount, btcService);
    console.log(`BTC ${BTC_TESTNET_TYPE} TxId: ${btcTxId}`);
    console.log(`explorer: https://mempool.space/signet/tx/${btcTxId}`);

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
            console.info(`Rgbpp asset has been transferred on BTC and the related CKB tx hash is ${txHash}`);
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
  toBtcAddress: 'tb1qtt2vh9q8xam35xxsy35ec6majad8lz8fep8w04',
  xudtTypeArgs: readStepLog('xUDT-type-script').args,
  transferAmount: BigInt(500_0000_0000),
});
