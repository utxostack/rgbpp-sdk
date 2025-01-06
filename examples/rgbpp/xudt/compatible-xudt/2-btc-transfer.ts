import { buildRgbppLockArgs } from 'rgbpp/ckb';
import { buildRgbppTransferTx } from 'rgbpp';
import { isMainnet, collector, btcService, btcAccount, btcDataSource, BTC_TESTNET_TYPE } from '../../env';
import { saveCkbVirtualTxResult } from '../../shared/utils';
import { signAndSendPsbt } from '../../shared/btc-account';
import { bitcoin } from 'rgbpp/btc';

interface RgbppTransferParams {
  rgbppLockArgsList: string[];
  toBtcAddress: string;
  transferAmount: bigint;
  compatibleXudtTypeScript: CKBComponents.Script;
}

const transferRusdOnBtc = async ({
  rgbppLockArgsList,
  toBtcAddress,
  compatibleXudtTypeScript,
  transferAmount,
}: RgbppTransferParams) => {
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
          console.info(
            `Rgbpp compatible xUDT asset has been transferred on BTC and the related CKB tx hash is ${txHash}`,
          );
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
transferRusdOnBtc({
  rgbppLockArgsList: [buildRgbppLockArgs(4, '44de1b4e3ddaa95cc85cc8b1c60f3e439d343002f0c60980fb4c70841ee0c75e')],
  toBtcAddress: 'tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt',
  // Please use your own RGB++ compatible xudt asset's type script
  compatibleXudtTypeScript: {
    codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
    hashType: 'type',
    args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
  },
  transferAmount: BigInt(100_0000),
});
