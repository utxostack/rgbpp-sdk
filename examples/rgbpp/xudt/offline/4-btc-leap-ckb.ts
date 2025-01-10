import {
  buildRgbppLockArgs,
  getXudtTypeScript,
  genRgbppLockScript,
  appendIssuerCellToBtcBatchTransfer,
  appendCkbTxWitnesses,
  updateCkbTxWithRealBtcTxId,
  sendCkbTx,
} from 'rgbpp/ckb';
import { addressToScript, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genBtcJumpCkbVirtualTx, sendRgbppUtxos, BtcAssetsApiError } from 'rgbpp';
import {
  isMainnet,
  collector,
  btcService,
  btcAccount,
  BTC_TESTNET_TYPE,
  CKB_PRIVATE_KEY,
  ckbAddress,
  initOfflineCkbCollector,
  vendorCellDeps,
  initOfflineBtcDataSource,
} from '../../env';
import { saveCkbVirtualTxResult } from '../../shared/utils';
import { signAndSendPsbt } from '../../shared/btc-account';

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

  const rgbppLocks = rgbppLockArgsList.map((args) => genRgbppLockScript(args, isMainnet, BTC_TESTNET_TYPE));
  const { collector: offlineCollector } = await initOfflineCkbCollector([
    ...rgbppLocks.map((lock) => ({ lock, type: xudtType })),
    { lock: addressToScript(ckbAddress) },
  ]);

  const ckbVirtualTxResult = await genBtcJumpCkbVirtualTx({
    collector: offlineCollector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount,
    toCkbAddress,
    isMainnet,
    btcTestnetType: BTC_TESTNET_TYPE,
    vendorCellDeps,
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '4-btc-leap-ckb-offline');

  const { commitment, ckbRawTx, sumInputsCapacity } = ckbVirtualTxResult;

  const btcOfflineDataSource = await initOfflineBtcDataSource(rgbppLockArgsList, btcAccount.from);

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [btcAccount.from],
    ckbCollector: offlineCollector,
    from: btcAccount.from,
    fromPubkey: btcAccount.fromPubkey,
    source: btcOfflineDataSource,
    needPaymaster: false,
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

      // pay tx fee
      const signedTx = await appendIssuerCellToBtcBatchTransfer({
        secp256k1PrivateKey: CKB_PRIVATE_KEY,
        issuerAddress: ckbAddress,
        ckbRawTx: ckbTx,
        collector: offlineCollector,
        sumInputsCapacity,
        isMainnet,
      });

      const txHash = await sendCkbTx({ collector, signedTx });
      console.info(`Rgbpp asset has been jumped from BTC to CKB and the related CKB tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 20 * 1000);
};

// Please use your real BTC UTXO information on the BTC Testnet
// BTC Testnet3: https://mempool.space/testnet
// BTC Signet: https://mempool.space/signet

// rgbppLockArgs: outIndexU32 + btcTxId
leapFromBtcToCKB({
  rgbppLockArgsList: [buildRgbppLockArgs(5, '316267e33808ae437c9870c3538ec5d46361e6474ace0e150442b10c41a1cb21')],
  toCkbAddress: 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfpu7pwavwf3yang8khrsklumayj6nyxhqpmh7fq',
  // Please use your own RGB++ xudt asset's xudtTypeArgs
  xudtTypeArgs: '0x13ce1d60ec65d693724006086568645aa24c019510ebc9af7cf6b993c2d7bffb',
  transferAmount: BigInt(233_0000_0000),
});

/* 
npx tsx examples/rgbpp/xudt/offline/4-btc-leap-ckb.ts
*/
