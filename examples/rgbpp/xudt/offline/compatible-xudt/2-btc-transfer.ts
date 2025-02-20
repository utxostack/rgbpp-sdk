import { addressToScript, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { BtcAssetsApiError, genBtcTransferCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';

import {
  isMainnet,
  collector,
  btcService,
  CKB_PRIVATE_KEY,
  ckbAddress,
  btcAccount,
  BTC_TESTNET_TYPE,
  initOfflineCkbCollector,
  initOfflineBtcDataSource,
  vendorCellDeps,
} from '../../../env';
import {
  appendCkbTxWitnesses,
  buildRgbppLockArgs,
  sendCkbTx,
  updateCkbTxWithRealBtcTxId,
  genRgbppLockScript,
  appendIssuerCellToBtcBatchTransferToSign,
  addressToScriptHash,
  signCkbTransaction,
} from 'rgbpp/ckb';
import { saveCkbVirtualTxResult } from '../../../shared/utils';
import { signAndSendPsbt } from '../../../shared/btc-account';

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
  const rgbppLocks = rgbppLockArgsList.map((args) => genRgbppLockScript(args, isMainnet, BTC_TESTNET_TYPE));
  const { collector: offlineCollector } = await initOfflineCkbCollector([
    ...rgbppLocks.map((lock) => ({ lock, type: compatibleXudtTypeScript })),
    { lock: addressToScript(ckbAddress) },
  ]);

  const ckbVirtualTxResult = await genBtcTransferCkbVirtualTx({
    collector: offlineCollector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(compatibleXudtTypeScript),
    transferAmount,
    isMainnet,
    btcTestnetType: BTC_TESTNET_TYPE,
    vendorCellDeps,
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '2-compatible-xudt-btc-transfer-offline');

  const { commitment, ckbRawTx, sumInputsCapacity } = ckbVirtualTxResult;

  const btcOfflineDataSource = await initOfflineBtcDataSource(rgbppLockArgsList, btcAccount.from);

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [toBtcAddress],
    needPaymaster: false,
    ckbCollector: offlineCollector,
    from: btcAccount.from,
    fromPubkey: btcAccount.fromPubkey,
    source: btcOfflineDataSource,
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
      console.info(`Rgbpp compatible xUDT asset has been transferred on BTC and the related CKB tx hash is ${txHash}`);
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
transferRusdOnBtc({
  rgbppLockArgsList: [buildRgbppLockArgs(2, '4239d2f9fe566513b0604e4dfe10f3b85b6bebe25096cf426559a89c87c68d1a')],
  toBtcAddress: 'tb1qe68sv5pr5vdj2daw2v96pwvw5m9ca4ew35ewp5',
  // Please use your own RGB++ compatible xudt asset's type script
  compatibleXudtTypeScript: {
    codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
    hashType: 'type',
    args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
  },
  transferAmount: BigInt(100_0000),
});

/* 
npx tsx examples/rgbpp/xudt/offline/compatible-xudt/2-btc-transfer.ts
*/
