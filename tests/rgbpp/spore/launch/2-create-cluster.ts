import { BtcAssetsApiError, genCreateClusterCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import { isMainnet, collector, btcAddress, btcDataSource, btcKeyPair, btcService } from '../../env';
import { CLUSTER_DATA } from './0-cluster-info';
import { transactionToHex } from 'rgbpp/btc';
import {
  appendCkbTxWitnesses,
  buildRgbppLockArgs,
  generateClusterCreateCoBuild,
  sendCkbTx,
  updateCkbTxWithRealBtcTxId,
} from 'rgbpp/ckb';
import { getFastestFeeRate, readStepLog, writeStepLog } from '../../shared/utils';
import { saveCkbVirtualTxResult } from '../../../../examples/rgbpp/shared/utils';

// Warning: Before runing this file, please run 1-prepare-cluster.ts
const createCluster = async ({ ownerRgbppLockArgs }: { ownerRgbppLockArgs: string }) => {
  console.log(btcAddress);
  const { retry } = await import('zx');
  await retry(20, '10s', async () => {
    const feeRate = await getFastestFeeRate();
    console.log('feeRate = ', feeRate);

    const ckbVirtualTxResult = await genCreateClusterCkbVirtualTx({
      collector,
      rgbppLockArgs: ownerRgbppLockArgs,
      clusterData: CLUSTER_DATA,
      isMainnet,
      ckbFeeRate: BigInt(2000),
    });

    // Save ckbVirtualTxResult
    saveCkbVirtualTxResult(ckbVirtualTxResult, '2-create-cluster');

    const { commitment, ckbRawTx, clusterId, needPaymasterCell } = ckbVirtualTxResult;

    writeStepLog('clusterid', {
      clusterid: clusterId,
    });
    console.log('clusterId: ', clusterId);

    // Send BTC tx
    const psbt = await sendRgbppUtxos({
      ckbVirtualTx: ckbRawTx,
      commitment,
      tos: [btcAddress!],
      needPaymaster: needPaymasterCell,
      ckbCollector: collector,
      from: btcAddress!,
      source: btcDataSource,
      feeRate: feeRate,
    });
    psbt.signAllInputs(btcKeyPair);
    psbt.finalizeAllInputs();

    const btcTx = psbt.extractTransaction();
    const btcTxBytes = transactionToHex(btcTx, false);
    const { txid: btcTxId } = await btcService.sendBtcTransaction(btcTx.toHex());

    writeStepLog('create-cluster-id', {
      txid: btcTxId,
      index: 1,
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

        console.log('The cluster rgbpp lock args: ', newCkbRawTx.outputs[0].lock.args);

        const ckbTx = await appendCkbTxWitnesses({
          ckbRawTx: newCkbRawTx,
          btcTxBytes,
          rgbppApiSpvProof,
        });
        // Replace cobuild witness with the final rgbpp lock script
        ckbTx.witnesses[ckbTx.witnesses.length - 1] = generateClusterCreateCoBuild(
          ckbTx.outputs[0],
          ckbTx.outputsData[0],
        );

        console.log(JSON.stringify(ckbTx));

        const txHash = await sendCkbTx({ collector, signedTx: ckbTx });
        console.info(`RGB++ Cluster has been created and tx hash is ${txHash}`);
        console.info(`explorer: https://pudge.explorer.nervos.org/transaction/${txHash}`);
      } catch (error) {
        if (!(error instanceof BtcAssetsApiError)) {
          console.error(error);
        }
      }
    }, 30 * 1000);
  });
};

// Please use your real BTC UTXO information on the BTC Testnet which should be same as the 1-prepare-cluster.ts
// rgbppLockArgs: outIndexU32 + btcTxId
createCluster({
  ownerRgbppLockArgs: buildRgbppLockArgs(readStepLog('prepare-utxo').index, readStepLog('prepare-utxo').txid),
});
