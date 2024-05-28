import { genRgbppLaunchCkbVirtualTx, sendRgbppUtxos, BtcAssetsApiError } from 'rgbpp';
import {
  buildRgbppLockArgs,
  RgbppTokenInfo,
  appendCkbTxWitnesses,
  updateCkbTxWithRealBtcTxId,
  sendCkbTx,
} from 'rgbpp/ckb';
import { RGBPP_TOKEN_INFO } from './0-rgbpp-token-info';
import { btcAddress, btcDataSource, btcKeyPair, btcService, collector, isMainnet } from '../../env';
import { transactionToHex } from 'rgbpp/btc';
import { saveCkbVirtualTxResult } from '../../shared/utils';

interface Params {
  ownerRgbppLockArgs: string;
  launchAmount: bigint;
  rgbppTokenInfo: RgbppTokenInfo;
}
const launchRgppAsset = async ({ ownerRgbppLockArgs, launchAmount, rgbppTokenInfo }: Params) => {
  const ckbVirtualTxResult = await genRgbppLaunchCkbVirtualTx({
    collector,
    ownerRgbppLockArgs,
    rgbppTokenInfo,
    launchAmount,
    isMainnet,
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '2-launch-rgbpp');

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  console.log('RGB++ Asset type script args: ', ckbRawTx.outputs[0].type?.args);

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
  const btcTxBytes = transactionToHex(btcTx, false);
  const { txid: btcTxId } = await btcService.sendBtcTransaction(btcTx.toHex());

  console.log('BTC TxId: ', btcTxId);

  const interval = setInterval(async () => {
    try {
      console.log('Waiting for BTC tx and proof to be ready');
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
      console.info(`RGB++ Asset has been launched and tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 30 * 1000);
};

// Use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
launchRgppAsset({
  ownerRgbppLockArgs: buildRgbppLockArgs(1, '6259ea7852e294afbd2aaf9ccd5c9c1f95087b0b08ba7e47ae35ce31170732bc'),
  rgbppTokenInfo: RGBPP_TOKEN_INFO,
  // The total issuance amount of RGBPP Token, the decimal is determined by RGBPP Token info
  launchAmount: BigInt(2100_0000) * BigInt(10 ** RGBPP_TOKEN_INFO.decimal),
});
