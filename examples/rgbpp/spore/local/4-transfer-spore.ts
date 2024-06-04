import {
  buildRgbppLockArgs,
  appendCkbTxWitnesses,
  updateCkbTxWithRealBtcTxId,
  sendCkbTx,
  getSporeTypeScript,
  Hex,
  generateSporeTransferCoBuild,
  genTransferSporeCkbVirtualTx,
} from 'rgbpp/ckb';
import { sendRgbppUtxos, transactionToHex } from 'rgbpp/btc';
import { BtcAssetsApiError } from 'rgbpp';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { isMainnet, collector, btcAddress, btcDataSource, btcKeyPair, btcService } from '../../env';
import { saveCkbVirtualTxResult } from '../../shared/utils';

interface SporeTransferParams {
  sporeRgbppLockArgs: Hex;
  toBtcAddress: string;
  sporeTypeArgs: Hex;
}

// Warning: It is not recommended for developers to use local examples unless you understand the entire process of RGB++ transactions.
const transferSpore = async ({ sporeRgbppLockArgs, toBtcAddress, sporeTypeArgs }: SporeTransferParams) => {
  // The spore type script is from 3-create-spore.ts, you can find it from the ckb tx spore output cells
  const sporeTypeBytes = serializeScript({
    ...getSporeTypeScript(isMainnet),
    args: sporeTypeArgs,
  });

  const ckbVirtualTxResult = await genTransferSporeCkbVirtualTx({
    collector,
    sporeRgbppLockArgs,
    sporeTypeBytes,
    isMainnet,
    ckbFeeRate: BigInt(5000),
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '4-transfer-spore-local');

  const { commitment, ckbRawTx, sporeCell, needPaymasterCell } = ckbVirtualTxResult;

  // console.log(JSON.stringify(ckbRawTx))

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [toBtcAddress],
    needPaymaster: needPaymasterCell,
    ckbCollector: collector,
    from: btcAddress!,
    source: btcDataSource,
    feeRate: 30,
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

      // Replace cobuild witness with the final rgbpp lock script
      ckbTx.witnesses[ckbTx.witnesses.length - 1] = generateSporeTransferCoBuild([sporeCell], ckbTx.outputs);

      // console.log('ckbTx: ', JSON.stringify(ckbTx));

      const txHash = await sendCkbTx({ collector, signedTx: ckbTx });
      console.info(`RGB++ Spore has been transferred and tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 30 * 1000);
};

// Please use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
transferSpore({
  // The spore rgbpp lock args is from 3-create-spore.ts
  sporeRgbppLockArgs: buildRgbppLockArgs(1, 'f203c8c13eacdbd126f85d286a963c85f233f8145363b1d997c4d552afb990e1'),
  toBtcAddress: 'tb1qhp9fh9qsfeyh0yhewgu27ndqhs5qlrqwau28m7',
  // Please use your own RGB++ spore asset's sporeTypeArgs
  sporeTypeArgs: '0x42898ea77062256f46e8f1b861d526ae47810ecc51ab50477945d5fa90452706',
});
