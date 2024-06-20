import { BtcAssetsApiError, buildRgbppTransferTx } from 'rgbpp';
import { appendCkbTxWitnesses, buildRgbppLockArgs, sendCkbTx, updateCkbTxWithRealBtcTxId } from 'rgbpp/ckb';
import { isMainnet, collector, btcDataSource, btcService, btcAccount, BTC_TESTNET_TYPE } from '../../env';
import { bitcoin } from 'rgbpp/btc';
import { saveCkbVirtualTxResult } from '../../shared/utils';
import { signAndSendPsbt } from '../../shared/btc-account';

interface RgbppTransferParams {
  rgbppLockArgsList: string[];
  toBtcAddress: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

// Warning: It is not recommended for developers to use local examples unless you understand the entire process of RGB++ transactions.
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
  saveCkbVirtualTxResult(ckbVirtualTxResult, '2-btc-transfer-local');

  const { ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = bitcoin.Psbt.fromHex(btcPsbtHex);
  const { txId: btcTxId, rawTxHex: btcTxBytes } = await signAndSendPsbt(psbt, btcAccount, btcService);
  console.log(`BTC ${BTC_TESTNET_TYPE} TxId: ${btcTxId}`);

  // Wait for BTC tx and proof to be ready, and then send isomorphic CKB transactions
  const interval = setInterval(async () => {
    try {
      console.log(`Waiting for BTC tx and proof to be ready`);
      const rgbppApiSpvProof = await btcService.getRgbppSpvProof(btcTxId, 0);
      clearInterval(interval);
      // Update CKB transaction with the real BTC txId
      const newCkbRawTx = updateCkbTxWithRealBtcTxId({ ckbRawTx, btcTxId, isMainnet });
      const ckbTx = await appendCkbTxWitnesses({
        ckbRawTx: newCkbRawTx,
        btcTxBytes,
        rgbppApiSpvProof,
      });

      const txHash = await sendCkbTx({ collector, signedTx: ckbTx });
      console.info(`RGB++ Asset has been transferred on BTC and the CKB tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 30 * 1000);
};

// Please use your real BTC UTXO information on the BTC Signet Testnet
// BTC Testnet3: https://mempool.space/testnet
// BTC Signet: https://mempool.space/signet

// rgbppLockArgs: outIndexU32 + btcTxId
transfer({
  rgbppLockArgsList: [buildRgbppLockArgs(2, '57212668f2738aa07a51861a2f8cd7a083aab05b01ede8b79dff948c0041f808')],
  toBtcAddress: 'tb1qhp9fh9qsfeyh0yhewgu27ndqhs5qlrqwau28m7',
  // Please use your own RGB++ asset's xudtTypeArgs
  xudtTypeArgs: '0x562e4e8a2f64a3e9c24beb4b7dd002d0ad3b842d0cc77924328e36ad114e3ebe',
  transferAmount: BigInt(800_0000_0000),
});
