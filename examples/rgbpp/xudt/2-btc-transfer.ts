import { buildRgbppLockArgs } from 'rgbpp/ckb';
import { buildRgbppTransferTx } from 'rgbpp';
import { isMainnet, collector, btcService, btcAccount } from '../env';
import { saveCkbVirtualTxResult } from '../shared/utils';
import { signAndSendPsbt } from '../shared/btc-account';
import { bitcoin } from 'rgbpp/btc';

interface RgbppTransferParams {
  rgbppLockArgsList: string[];
  toBtcAddress: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

const transfer = async ({ rgbppLockArgsList, toBtcAddress, xudtTypeArgs, transferAmount }: RgbppTransferParams) => {
  const { ckbVirtualTxResult, btcTxHexToSign } = await buildRgbppTransferTx({
    collector,
    xudtTypeArgs,
    rgbppLockArgsList,
    transferAmount,
    fromBtcAddress: btcAccount.from,
    toBtcAddress,
    btcDataSource,
    isMainnet,
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '2-btc-transfer');

  // Send BTC tx
  const psbt = bitcoin.Psbt.fromHex(btcTxHexToSign);

  const { txId: btcTxId } = await signAndSendPsbt(psbt, btcAccount, btcService);
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
          console.info(`Rgbpp asset has been transferred on BTC and the related CKB tx hash is ${txHash}`);
        } else {
          console.warn(`Rgbpp CKB transaction failed and the reason is ${failedReason} `);
        }
      }
    }, 30 * 1000);
  } catch (error) {
    console.error(error);
  }
};

// Please use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
transfer({
  rgbppLockArgsList: [buildRgbppLockArgs(1, '64252b582aea1249ed969a20385fae48bba35bf1ab9b3df3b0fcddc754ccf592')],
  toBtcAddress: 'tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt',
  // Please use your own RGB++ xudt asset's xudtTypeArgs
  xudtTypeArgs: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  transferAmount: BigInt(800_0000_0000),
});
