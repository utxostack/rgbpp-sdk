import { buildRgbppLockArgs, getXudtTypeScript } from 'rgbpp/ckb';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genBtcJumpCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import { isMainnet, collector, btcService, btcDataSource, btcAccount, BTC_TESTNET_TYPE } from '../env';
import { readStepLog } from '../shared/utils';
import { saveCkbVirtualTxResult } from '../../../examples/rgbpp/shared/utils';
import { signAndSendPsbt } from '../../../examples/rgbpp/shared/btc-account';

interface LeapToCkbParams {
  rgbppLockArgsList: string[];
  toCkbAddress: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

const leapFromBtcToCKB = async ({ rgbppLockArgsList, toCkbAddress, xudtTypeArgs, transferAmount }: LeapToCkbParams) => {
  const { retry } = await import('zx');
  await retry(120, '10s', async () => {
    const xudtType: CKBComponents.Script = {
      ...getXudtTypeScript(isMainnet),
      args: xudtTypeArgs,
    };

    const ckbVirtualTxResult = await genBtcJumpCkbVirtualTx({
      collector,
      rgbppLockArgsList,
      xudtTypeBytes: serializeScript(xudtType),
      transferAmount,
      toCkbAddress,
      isMainnet,
      btcTestnetType: BTC_TESTNET_TYPE,
    });

    // Save ckbVirtualTxResult
    saveCkbVirtualTxResult(ckbVirtualTxResult, '3-btc-leap-ckb');

    const { commitment, ckbRawTx } = ckbVirtualTxResult;

    // Send BTC tx
    const psbt = await sendRgbppUtxos({
      ckbVirtualTx: ckbRawTx,
      commitment,
      tos: [btcAccount.from],
      ckbCollector: collector,
      from: btcAccount.from,
      fromPubkey: btcAccount.fromPubkey,
      source: btcDataSource,
      feeRate: 1,
    });

    const { txId: btcTxId } = await signAndSendPsbt(psbt, btcAccount, btcService);
    console.log(`BTC ${BTC_TESTNET_TYPE} TxId: ${btcTxId}`);
    console.log(`explorer: https://mempool.space/signet/tx/${btcTxId}`);

    await btcService.sendRgbppCkbTransaction({ btc_txid: btcTxId, ckb_virtual_result: ckbVirtualTxResult });

    try {
      const interval = setInterval(async () => {
        const { state, failedReason } = await btcService.getRgbppTransactionState(btcTxId);
        console.log('state', state);
        if (state === 'completed' || state === 'failed') {
          clearInterval(interval);
          if (state === 'completed') {
            const { txhash: txHash } = await btcService.getRgbppTransactionHash(btcTxId);
            console.info(`Rgbpp asset has been jumped from BTC to CKB and the related CKB tx hash is ${txHash}`);
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

// rgbppLockArgs: outIndexU32 + btcTxId
leapFromBtcToCKB({
  rgbppLockArgsList: [buildRgbppLockArgs(readStepLog('transfer-id').index, readStepLog('transfer-id').txid)],
  toCkbAddress: 'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9kxr7vy7yknezj0vj0xptx6thk6pwyr0sxamv6q',
  xudtTypeArgs: readStepLog('xUDT-type-script').args,
  transferAmount: BigInt(300_0000_0000),
});
