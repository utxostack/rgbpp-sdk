import {
  buildRgbppLockArgs,
  getXudtTypeScript,
  genRgbppLockScript,
  unpackRgbppLockArgs,
  remove0x,
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
  btcDataSource,
  btcAccount,
  BTC_TESTNET_TYPE,
  networkType,
  CKB_PRIVATE_KEY,
  ckbAddress,
  initOfflineCkbCollector,
} from '../../env';
import { saveCkbVirtualTxResult } from '../../shared/utils';
import { signAndSendPsbt } from '../../shared/btc-account';
import { BtcApiTransaction } from 'rgbpp/dist/service.js';
import { OfflineDataSource } from 'rgbpp/btc';

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
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '4-btc-leap-ckb-offline');

  const { commitment, ckbRawTx, sumInputsCapacity } = ckbVirtualTxResult;

  const rgbppBtcTxs: BtcApiTransaction[] = [];
  for await (const rgbppLockArgs of rgbppLockArgsList) {
    const tx = await btcService.getBtcTransaction(remove0x(unpackRgbppLockArgs(rgbppLockArgs).btcTxId));
    if (!tx) {
      throw new Error('BTC tx not found');
    }
    rgbppBtcTxs.push(tx);
  }
  const feeUtxos = await btcDataSource.getUtxos(btcAccount.from, { only_non_rgbpp_utxos: true });
  const btcOfflineDataSource = new OfflineDataSource(networkType, {
    txs: rgbppBtcTxs,
    feeUtxos,
  });

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
    feeRate: 2048,
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
  rgbppLockArgsList: [buildRgbppLockArgs(5, 'e0e28898677a1b04617469531084bfff43d3c1aca113a054487f37106197cc50')],
  toCkbAddress: 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfpu7pwavwf3yang8khrsklumayj6nyxhqpmh7fq',
  // Please use your own RGB++ xudt asset's xudtTypeArgs
  xudtTypeArgs: '0x2db4e32c353afc0dfc9ddd8e19b2c79dc10f81e6f90fa27d57a60179ffbf3cd4',
  transferAmount: BigInt(233_0000_0000),
});

/* 
npx tsx examples/rgbpp/xudt/offline/4-btc-leap-ckb.ts
*/
