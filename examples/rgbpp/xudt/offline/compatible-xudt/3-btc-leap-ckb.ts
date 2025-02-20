import {
  buildRgbppLockArgs,
  genRgbppLockScript,
  appendIssuerCellToBtcBatchTransferToSign,
  signCkbTransaction,
  addressToScriptHash,
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
} from '../../../env';
import { saveCkbVirtualTxResult } from '../../../shared/utils';
import { signAndSendPsbt } from '../../../shared/btc-account';

interface LeapToCkbParams {
  rgbppLockArgsList: string[];
  toCkbAddress: string;
  transferAmount: bigint;
  compatibleXudtTypeScript: CKBComponents.Script;
}

const leapRusdFromBtcToCKB = async ({
  rgbppLockArgsList,
  toCkbAddress,
  compatibleXudtTypeScript,
  transferAmount,
}: LeapToCkbParams) => {
  const rgbppLocks = rgbppLockArgsList.map((args) => genRgbppLockScript(args, isMainnet, BTC_TESTNET_TYPE));
  const { collector: offlineCollector } = await initOfflineCkbCollector([
    ...rgbppLocks.map((lock) => ({ lock, type: compatibleXudtTypeScript })),
    { lock: addressToScript(ckbAddress) },
  ]);

  const ckbVirtualTxResult = await genBtcJumpCkbVirtualTx({
    collector: offlineCollector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(compatibleXudtTypeScript),
    transferAmount,
    toCkbAddress,
    isMainnet,
    btcTestnetType: BTC_TESTNET_TYPE,
    vendorCellDeps,
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '3-compatible-xudt-btc-leap-ckb-offline');

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
    feeRate: 128,
  });

  const { txId: btcTxId, rawTxHex: btcTxBytes } = await signAndSendPsbt(psbt, btcAccount, btcService);
  console.log(`BTC ${BTC_TESTNET_TYPE} TxId: ${btcTxId}`);
  console.log('BTC tx bytes: ', btcTxBytes);

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

      const { ckbRawTx: unsignedTx, inputCells } = await appendIssuerCellToBtcBatchTransferToSign({
        issuerAddress: ckbAddress,
        ckbRawTx: ckbTx,
        collector: offlineCollector,
        sumInputsCapacity,
        isMainnet,
      });

      const keyMap = new Map<string, string>();
      keyMap.set(addressToScriptHash(ckbAddress), CKB_PRIVATE_KEY);
      const signedTx = signCkbTransaction(keyMap, unsignedTx, inputCells, true);

      const txHash = await sendCkbTx({ collector, signedTx });
      console.info(
        `Rgbpp compatible xUDT asset has been leaped from BTC to CKB and the related CKB tx hash is ${txHash}`,
      );
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
leapRusdFromBtcToCKB({
  rgbppLockArgsList: [buildRgbppLockArgs(2, 'daec93a97c8b7f6fdd33696f814f0292be966dc4ea4853400d3cada816c70f5d')],
  toCkbAddress: 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfpu7pwavwf3yang8khrsklumayj6nyxhqpmh7fq',
  // Please use your own RGB++ compatible xudt asset's type script
  compatibleXudtTypeScript: {
    codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
    hashType: 'type',
    args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
  },
  transferAmount: BigInt(10_0000),
});

/* 
npx tsx examples/rgbpp/xudt/offline/compatible-xudt/3-btc-leap-ckb.ts
*/
