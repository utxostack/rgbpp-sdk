import { buildRgbppLockArgs } from 'rgbpp/ckb';
import { buildRgbppTransferTx } from 'rgbpp';
import { isMainnet, collector, btcService, btcAccount, btcDataSource, BTC_TESTNET_TYPE } from '../env';
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
    },
    isMainnet,
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '2-btc-transfer');

  // Send BTC tx
  const psbt = bitcoin.Psbt.fromHex(btcPsbtHex);
  const { txId: btcTxId } = await signAndSendPsbt(psbt, btcAccount, btcService);
  console.log(`BTC ${BTC_TESTNET_TYPE} TxId: ${btcTxId}`);

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
// BTC Testnet3: https://mempool.space/testnet
// BTC Signet: https://mempool.space/signet

// rgbppLockArgs: outIndexU32 + btcTxId
transfer({
  rgbppLockArgsList: [buildRgbppLockArgs(1, '5ddd7b60ba93e01d9781be50eaa5c1aa634f799fc9c47bf59d1566eacf47b1e8')],
  toBtcAddress: 'tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt',
  // Please use your own RGB++ xudt asset's xudtTypeArgs
  xudtTypeArgs: '0x562e4e8a2f64a3e9c24beb4b7dd002d0ad3b842d0cc77924328e36ad114e3ebe',
  transferAmount: BigInt(800_0000_0000),
});
