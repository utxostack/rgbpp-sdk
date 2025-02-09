import {
  buildRgbppLockArgs,
  getXudtTypeScript,
  genRgbppLockScript,
  appendOwnerCellToRgbppTx,
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
    feeRate: 256,
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

      const { ckbRawTx: unsignedTx, inputCells } = await appendOwnerCellToRgbppTx({
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
  rgbppLockArgsList: [buildRgbppLockArgs(1, 'dfb3be075b831ce7605ab3f56b7dda39ba7438e015ded3332db1f54cfac161de')],
  toCkbAddress: 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfpu7pwavwf3yang8khrsklumayj6nyxhqpmh7fq',
  // Please use your own RGB++ xudt asset's xudtTypeArgs
  xudtTypeArgs: '0xe402314a4b31223afe00a9c69c0b872863b990219525e1547ec05d9d88434b24',
  transferAmount: BigInt(100_0000_0000),
});

/* 
npx tsx examples/rgbpp/xudt/offline/4-btc-leap-ckb.ts
*/
