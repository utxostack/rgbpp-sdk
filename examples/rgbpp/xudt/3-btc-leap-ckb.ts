import { buildRgbppLockArgs, getXudtTypeScript } from 'rgbpp/ckb';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genBtcJumpCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import { isMainnet, collector, btcAddress, btcKeyPair, btcService, btcDataSource } from '../env';
import { saveCkbVirtualTxResult } from '../shared/utils';

interface LeapToCkbParams {
  rgbppLockArgsList: string[];
  toCkbAddress: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

const leapFromBtcToCKB = async ({ rgbppLockArgsList, toCkbAddress, xudtTypeArgs, transferAmount }: LeapToCkbParams) => {
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
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '3-btc-leap-ckb');

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [btcAddress!],
    ckbCollector: collector,
    from: btcAddress!,
    source: btcDataSource,
  });
  psbt.signAllInputs(btcKeyPair);
  psbt.finalizeAllInputs();

  const btcTx = psbt.extractTransaction();
  const { txid: btcTxId } = await btcService.sendBtcTransaction(btcTx.toHex());

  console.log('BTC TxId: ', btcTxId);

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
        } else {
          console.warn(`Rgbpp CKB transaction failed and the reason is ${failedReason} `);
        }
      }
    }, 30 * 1000);
  } catch (error) {
    console.error(error);
  }
};

// rgbppLockArgs: outIndexU32 + btcTxId
leapFromBtcToCKB({
  rgbppLockArgsList: [buildRgbppLockArgs(1, '6edd4b9327506fab09fb9a0f5e5f35136a6a94bd4c9dd79af04921618fa6c800')],
  toCkbAddress: 'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9kxr7vy7yknezj0vj0xptx6thk6pwyr0sxamv6q',
  xudtTypeArgs: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  transferAmount: BigInt(800_0000_0000),
});
