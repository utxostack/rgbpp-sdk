import { BtcAssetsApiError, genCreateSporeCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import { isMainnet, collector, btcDataSource, btcService, CKB_PRIVATE_KEY, ckbAddress } from '../../env';
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
import { utf8ToBuffer } from 'rgbpp/btc';
import { readStepLog, writeStepLog } from '../../shared/utils';
import { saveCkbVirtualTxResult } from '../../../../examples/rgbpp/shared/utils';
import { BTC_TESTNET_TYPE, btcAccount } from '../../../../examples/rgbpp/env';
import { signAndSendPsbt } from '../../../../examples/rgbpp/shared/btc-account';

interface SporeCreateParams {
  clusterRgbppLockArgs: Hex;
  receivers: {
    toBtcAddress: string;
    sporeData: RawSporeData;
  }[];
}

// Warning: Before runing this file for the first time, please run 2-prepare-cluster.ts
const createSpores = async ({ clusterRgbppLockArgs, receivers }: SporeCreateParams) => {
  const { retry } = await import('zx');
  await retry(20, '10s', async () => {
    const ckbVirtualTxResult = await genCreateSporeCkbVirtualTx({
      collector,
      sporeDataList: receivers.map((receiver) => receiver.sporeData),
      clusterRgbppLockArgs,
      isMainnet,
      ckbFeeRate: BigInt(2000),
      btcTestnetType: BTC_TESTNET_TYPE,
    });

    // Save ckbVirtualTxResult
    saveCkbVirtualTxResult(ckbVirtualTxResult, '3-create-spores');

    const { commitment, ckbRawTx, sumInputsCapacity, clusterCell, needPaymasterCell } = ckbVirtualTxResult;

    // Send BTC tx
    // The first btc address is the owner of the cluster cell and the rest btc addresses are spore receivers
    const btcTos = [btcAccount.from, ...receivers.map((receiver) => receiver.toBtcAddress)];
    const psbt = await sendRgbppUtxos({
      ckbVirtualTx: ckbRawTx,
      commitment,
      tos: btcTos,
      needPaymaster: needPaymasterCell,
      ckbCollector: collector,
      from: btcAccount.from,
      fromPubkey: btcAccount.fromPubkey,
      source: btcDataSource,
      feeRate: 1,
    });

    const { txId: btcTxId, rawTxHex: btcTxBytes } = await signAndSendPsbt(psbt, btcAccount, btcService);

    writeStepLog('create-spores-id', {
      txid: btcTxId,
    });
    console.log('BTC TxId: ', btcTxId);
    console.log(`explorer: https://mempool.space/testnet/tx/${btcTxId}`);

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
        const sporeTypeScripts = ckbTx.outputs.slice(1).map((output) => output.type);
        console.log('Spore type scripts: ', JSON.stringify(sporeTypeScripts));
        writeStepLog('sporeTypeScripts', sporeTypeScripts);

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
        console.info(`explorer: https://pudge.explorer.nervos.org/transaction/${txHash}`);
      } catch (error) {
        if (!(error instanceof BtcAssetsApiError)) {
          console.error(error);
        }
      }
    }, 30 * 1000);
  });
};

// Please use your real BTC UTXO information on the BTC Testnet
// BTC Testnet3: https://mempool.space/testnet
// BTC Signet: https://mempool.space/signet

// rgbppLockArgs: outIndexU32 + btcTxId
createSpores({
  // The cluster cell will be spent and the new cluster cell will be created in each spore creation tx,
  // so the cluster rgbpp lock args should be updated after each spore creation tx is completed.
  // The first cluster rgbpp lock args is from 2-create-cluster.ts and the new cluster rgbpp lock args can be found from the log in the line 71 of this file
  clusterRgbppLockArgs: buildRgbppLockArgs(
    readStepLog('create-cluster-id').index,
    readStepLog('create-cluster-id').txid,
  ),
  receivers: [
    {
      toBtcAddress: 'tb1qssu8pscsuevnmvhnr08840wvuzdan27k9m46ja',
      sporeData: {
        contentType: 'text/plain',
        content: utf8ToBuffer('First Spore'),
        // The cluster id is from 2-create-cluster.ts
        clusterId: readStepLog('clusterid').clusterid,
      },
    },
    {
      toBtcAddress: 'tb1qssu8pscsuevnmvhnr08840wvuzdan27k9m46ja',
      sporeData: {
        contentType: 'text/plain',
        content: utf8ToBuffer('Second Spore'),
        // The cluster id is from 2-create-cluster.ts
        clusterId: readStepLog('clusterid').clusterid,
      },
    },
  ],
});
