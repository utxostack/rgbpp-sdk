import { addressToScript, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { BtcAssetsApiError, genBtcBatchTransferCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import { RGBPP_TOKEN_INFO } from './0-rgbpp-token-info';
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
} from '../../env';
import {
  RgbppBtcAddressReceiver,
  appendCkbTxWitnesses,
  buildRgbppLockArgs,
  getXudtTypeScript,
  sendCkbTx,
  updateCkbTxWithRealBtcTxId,
  genRgbppLockScript,
  appendOwnerCellToRgbppTx,
  addressToScriptHash,
  signCkbTransaction,
} from 'rgbpp/ckb';
import { saveCkbVirtualTxResult } from '../../shared/utils';
import { signAndSendPsbt } from '../../shared/btc-account';

interface Params {
  rgbppLockArgsList: string[];
  receivers: RgbppBtcAddressReceiver[];
  xudtTypeArgs: string;
}

// Warning: Before runing this file for the first time, please run 2-launch-rgbpp.ts
const distributeRgbppAssetOnBtc = async ({ rgbppLockArgsList, receivers, xudtTypeArgs }: Params) => {
  // Warning: Please replace with your real xUDT type script here
  const xudtType: CKBComponents.Script = {
    ...getXudtTypeScript(isMainnet),
    // The xUDT type script args is generated by 2-launch-rgbpp.ts, and it can be found from the log
    args: xudtTypeArgs,
  };

  const rgbppLocks = rgbppLockArgsList.map((args) => genRgbppLockScript(args, isMainnet, BTC_TESTNET_TYPE));
  const { collector: offlineCollector } = await initOfflineCkbCollector([
    ...rgbppLocks.map((lock) => ({ lock, type: xudtType })),
    { lock: addressToScript(ckbAddress) },
  ]);

  const ckbVirtualTxResult = await genBtcBatchTransferCkbVirtualTx({
    collector: offlineCollector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(xudtType),
    rgbppReceivers: receivers,
    isMainnet,
    btcTestnetType: BTC_TESTNET_TYPE,
    vendorCellDeps,
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '3-distribute-rgbpp-offline');

  const { commitment, ckbRawTx, sumInputsCapacity, rgbppChangeOutIndex } = ckbVirtualTxResult;

  // The first output utxo is OP_RETURN
  // Rgbpp change utxo position depends on the number of distributions, if 50 addresses are distributed, then the change utxo position is 51
  console.log('RGB++ asset change utxo out index: ', rgbppChangeOutIndex);

  const btcOfflineDataSource = await initOfflineBtcDataSource(rgbppLockArgsList, btcAccount.from);

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: receivers.map((receiver) => receiver.toBtcAddress),
    needPaymaster: false,
    ckbCollector: offlineCollector,
    from: btcAccount.from,
    fromPubkey: btcAccount.fromPubkey,
    source: btcOfflineDataSource,
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
      console.info(`RGB++ Asset has been distributed and CKB tx hash is ${txHash}`);
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
distributeRgbppAssetOnBtc({
  // Warning: If rgbpp assets are distributed continuously, then the position of the current rgbpp asset utxo depends on the position of the previous change utxo distributed
  rgbppLockArgsList: [buildRgbppLockArgs(1, '65e0574dfdbed4809736f3ec5a73aa191f147873d083ddb9978aecb969dd1900')],
  // The xudtTypeArgs comes from the logs "RGB++ Asset type script args" of 2-launch-rgbpp.ts
  xudtTypeArgs: '0xe402314a4b31223afe00a9c69c0b872863b990219525e1547ec05d9d88434b24',
  receivers: [
    {
      toBtcAddress: 'tb1qeq27se73d0e6zkh53e3xrj90vqzv8g7ja3nm85',
      transferAmount: BigInt(1000) * BigInt(10 ** RGBPP_TOKEN_INFO.decimal),
    },
    {
      toBtcAddress: 'tb1q4vkt8486w7syqyvz3a4la0f3re5vvj9zw4henw',
      transferAmount: BigInt(2000) * BigInt(10 ** RGBPP_TOKEN_INFO.decimal),
    },
    {
      toBtcAddress: 'tb1qp742mjfxzttnvs0cdttfrvmqqtkgljm5d4e86n',
      transferAmount: BigInt(3000) * BigInt(10 ** RGBPP_TOKEN_INFO.decimal),
    },
    {
      toBtcAddress: 'tb1qyyhdxmhc059rksfh9jjlkqgvs4w6mdl0z3zqj3',
      transferAmount: BigInt(4000) * BigInt(10 ** RGBPP_TOKEN_INFO.decimal),
    },
  ],
});

/* 
npx tsx examples/rgbpp/xudt/offline/3-distribute-rgbpp.ts
*/
