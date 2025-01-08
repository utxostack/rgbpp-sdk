import { genRgbppLaunchCkbVirtualTx, sendRgbppUtxos, BtcAssetsApiError } from 'rgbpp';
import {
  buildRgbppLockArgs,
  RgbppTokenInfo,
  appendCkbTxWitnesses,
  updateCkbTxWithRealBtcTxId,
  sendCkbTx,
  genRgbppLockScript,
} from 'rgbpp/ckb';
import { RGBPP_TOKEN_INFO } from './0-rgbpp-token-info';
import {
  BTC_TESTNET_TYPE,
  btcAccount,
  btcService,
  collector,
  initOfflineBtcDataSource,
  initOfflineCkbCollector,
  isMainnet,
  vendorCellDeps,
} from '../../env';
import { saveCkbVirtualTxResult } from '../../shared/utils';
import { signAndSendPsbt } from '../../shared/btc-account';

interface Params {
  ownerRgbppLockArgs: string;
  launchAmount: bigint;
  rgbppTokenInfo: RgbppTokenInfo;
}

const launchRgppAsset = async ({ ownerRgbppLockArgs, launchAmount, rgbppTokenInfo }: Params) => {
  const { collector: offlineCollector } = await initOfflineCkbCollector([
    { lock: genRgbppLockScript(ownerRgbppLockArgs, isMainnet, BTC_TESTNET_TYPE) },
  ]);

  const ckbVirtualTxResult = await genRgbppLaunchCkbVirtualTx({
    collector: offlineCollector,
    ownerRgbppLockArgs,
    rgbppTokenInfo,
    launchAmount,
    isMainnet,
    btcTestnetType: BTC_TESTNET_TYPE,
    vendorCellDeps,
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '2-launch-rgbpp-offline');

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  console.log('RGB++ Asset type script args: ', ckbRawTx.outputs[0].type?.args);

  const btcOfflineDataSource = await initOfflineBtcDataSource([ownerRgbppLockArgs]);

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [btcAccount.from],
    needPaymaster: false,
    ckbCollector: offlineCollector,
    from: btcAccount.from,
    fromPubkey: btcAccount.fromPubkey,
    source: btcOfflineDataSource,
    feeRate: 6000,
  });

  const { txId: btcTxId, rawTxHex: btcTxBytes } = await signAndSendPsbt(psbt, btcAccount, btcService);
  console.log(`BTC ${BTC_TESTNET_TYPE} TxId: ${btcTxId}`);

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
      console.info(`RGB++ Asset has been launched and CKB tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 30 * 1000);
};

// Please use your real BTC UTXO information on the BTC Testnet which should be same as the 1-prepare-launch.ts
// BTC Testnet3: https://mempool.space/testnet
// BTC Signet: https://mempool.space/signet

// rgbppLockArgs: outIndexU32 + btcTxId
launchRgppAsset({
  ownerRgbppLockArgs: buildRgbppLockArgs(2, '8ae0e7c4834ee409815a56774ec4cf9dc9d14851f3587c01e67f6086f07454ac'),
  rgbppTokenInfo: RGBPP_TOKEN_INFO,
  // The total issuance amount of RGBPP Token, the decimal is determined by RGBPP Token info
  launchAmount: BigInt(2100_0000) * BigInt(10 ** RGBPP_TOKEN_INFO.decimal),
});

/* 
npx tsx examples/rgbpp/xudt/offline/2-launch-rgbpp.ts
*/
