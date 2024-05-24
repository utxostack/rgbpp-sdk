import { BtcAssetsApiError, genCreateSporeCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import {
  isMainnet,
  collector,
  btcAddress,
  btcDataSource,
  btcKeyPair,
  btcService,
  CKB_PRIVATE_KEY,
  ckbAddress,
} from '../../env';
import {
  Hex,
  appendCkbTxWitnesses,
  appendIssuerCellToSporesCreate,
  buildRgbppLockArgs,
  generateSporeCreateCoBuild,
  sendCkbTx,
  updateCkbTxWithRealBtcTxId,
  RawSporeData,
} from 'rgbpp/ckb';
import { transactionToHex, utf8ToBuffer } from 'rgbpp/btc';
import { saveCkbVirtualTxResult } from '../../shared/utils';

interface SporeCreateParams {
  clusterRgbppLockArgs: Hex;
  receivers: {
    toBtcAddress: string;
    sporeData: RawSporeData;
  }[];
}

const createSpores = async ({ clusterRgbppLockArgs, receivers }: SporeCreateParams) => {
  const ckbVirtualTxResult = await genCreateSporeCkbVirtualTx({
    collector,
    sporeDataList: receivers.map((receiver) => receiver.sporeData),
    clusterRgbppLockArgs,
    isMainnet,
    ckbFeeRate: BigInt(2000),
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '3-create-spores');

  const { commitment, ckbRawTx, sumInputsCapacity, clusterCell } = ckbVirtualTxResult;

  // Send BTC tx
  // The first btc address is the owner of the cluster cell and the rest btc addresses are spore receivers
  const btcTos = [btcAddress!, ...receivers.map((receiver) => receiver.toBtcAddress)];
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: btcTos,
    ckbCollector: collector,
    from: btcAddress!,
    source: btcDataSource,
    feeRate: 120,
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
      console.log('The new cluster rgbpp lock args: ', newCkbRawTx.outputs[0].lock.args);

      const ckbTx = await appendCkbTxWitnesses({
        ckbRawTx: newCkbRawTx,
        btcTxBytes,
        rgbppApiSpvProof,
      });

      // The outputs[1..] are spore cells from which you can find spore type scripts,
      // and the spore type scripts will be used to transfer and leap spores
      console.log('Spore type scripts: ', JSON.stringify(ckbTx.outputs.slice(1).map((output) => output.type)));

      // Replace cobuild witness with the final rgbpp lock script
      ckbTx.witnesses[ckbTx.witnesses.length - 1] = generateSporeCreateCoBuild({
        // The first output is cluster cell and the rest of the outputs are spore cells
        sporeOutputs: ckbTx.outputs.slice(1),
        sporeOutputsData: ckbTx.outputsData.slice(1),
        clusterCell,
        clusterOutputCell: ckbTx.outputs[0],
      });

      // console.log('ckbTx: ', JSON.stringify(ckbTx));

      const signedTx = await appendIssuerCellToSporesCreate({
        secp256k1PrivateKey: CKB_PRIVATE_KEY,
        issuerAddress: ckbAddress,
        ckbRawTx: ckbTx,
        collector,
        sumInputsCapacity,
        isMainnet,
      });

      const txHash = await sendCkbTx({ collector, signedTx });
      console.info(`RGB++ Spore has been created and tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 30 * 1000);
};

// Use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
createSpores({
  // The cluster cell will be spent and the new cluster cell will be created in each spore creation tx,
  // so the cluster rgbpp lock args should be updated after each spore creation tx is completed.
  // The first cluster rgbpp lock args is from 2-create-cluster.ts and the new cluster rgbpp lock args can be found from the log in the line 71 of this file
  clusterRgbppLockArgs: buildRgbppLockArgs(1, '96bccaadd3c8f59b2411e3d64ae4c1743532415f953fc4f9741a5fd7a0a34483'),
  receivers: [
    {
      toBtcAddress: 'tb1qhp9fh9qsfeyh0yhewgu27ndqhs5qlrqwau28m7',
      sporeData: {
        contentType: 'text/plain',
        content: utf8ToBuffer('First Spore'),
        // The cluster id is from 2-create-cluster.ts
        clusterId: '0xbc5168a4f90116fada921e185d4b018e784dc0f6266e539a3c092321c932700a',
      },
    },
    {
      toBtcAddress: 'tb1qhp9fh9qsfeyh0yhewgu27ndqhs5qlrqwau28m7',
      sporeData: {
        contentType: 'text/plain',
        content: utf8ToBuffer('Second Spore'),
        // The cluster id is from 2-create-cluster.ts
        clusterId: '0xbc5168a4f90116fada921e185d4b018e784dc0f6266e539a3c092321c932700a',
      },
    },
  ],
});
