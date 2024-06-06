import { buildRgbppLockArgs, getXudtTypeScript } from 'rgbpp/ckb';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genBtcTransferCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import { isMainnet, collector, btcAddress, btcKeyPair, btcService, btcDataSource } from '../env';
import { readStepLog, writeStepLog } from '../shared/utils';

interface RgbppTransferParams {
  rgbppLockArgsList: string[];
  toBtcAddress: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

const transfer = async ({ rgbppLockArgsList, toBtcAddress, xudtTypeArgs, transferAmount }: RgbppTransferParams) => {
  const { retry } = await import('zx');
  await retry(120, '10s', async () => {
    const xudtType: CKBComponents.Script = {
      ...getXudtTypeScript(isMainnet),
      args: xudtTypeArgs,
    };

    const ckbVirtualTxResult = await genBtcTransferCkbVirtualTx({
      collector,
      rgbppLockArgsList,
      xudtTypeBytes: serializeScript(xudtType),
      transferAmount,
      isMainnet,
    });

    const { commitment, ckbRawTx } = ckbVirtualTxResult;

    // Send BTC tx
    const psbt = await sendRgbppUtxos({
      ckbVirtualTx: ckbRawTx,
      commitment,
      tos: [toBtcAddress],
      ckbCollector: collector,
      from: btcAddress!,
      source: btcDataSource,
    });
    psbt.signAllInputs(btcKeyPair);
    psbt.finalizeAllInputs();

    const btcTx = psbt.extractTransaction();
    const { txid: btcTxId } = await btcService.sendBtcTransaction(btcTx.toHex());

    console.log('BTC TxId: ', btcTxId);
    console.log(`explorer: https://mempool.space/testnet/tx/${btcTxId}`);

    writeStepLog('2', {
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
  rgbppLockArgsList: [buildRgbppLockArgs(readStepLog('xudt').index, readStepLog('xudt').txid)],
  toBtcAddress: 'tb1qtt2vh9q8xam35xxsy35ec6majad8lz8fep8w04',
  xudtTypeArgs: readStepLog('1').args,
  transferAmount: BigInt(500_0000_0000),
});
