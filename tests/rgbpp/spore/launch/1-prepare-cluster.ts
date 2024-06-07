import { addressToScript, getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';
import {
  MAX_FEE,
  NoLiveCellError,
  SECP256K1_WITNESS_LOCK_SIZE,
  append0x,
  buildRgbppLockArgs,
  calculateRgbppClusterCellCapacity,
  calculateTransactionFee,
  genRgbppLockScript,
  getSecp256k1CellDep,
} from 'rgbpp/ckb';
import { ckbAddress, isMainnet, collector, CKB_PRIVATE_KEY } from '../../env';
import { CLUSTER_DATA } from './0-cluster-info';
import { readStepLog } from '../../shared/utils';

const prepareClusterCell = async ({ outIndex, btcTxId }: { outIndex: number; btcTxId: string }) => {
  const { retry } = await import('zx');
  await retry(20, '10s', async () => {
    const masterLock = addressToScript(ckbAddress);
    console.log('ckb address: ', ckbAddress);

    // The capacity required to launch cells is determined by the token info cell capacity, and transaction fee.
    const clusterCellCapacity = calculateRgbppClusterCellCapacity(CLUSTER_DATA);

    let emptyCells = await collector.getCells({
      lock: masterLock,
    });
    if (!emptyCells || emptyCells.length === 0) {
      throw new NoLiveCellError('The address has no empty cells');
    }
    emptyCells = emptyCells.filter((cell) => !cell.output.type);

    const txFee = MAX_FEE;
    const { inputs, sumInputsCapacity } = collector.collectInputs(emptyCells, clusterCellCapacity, txFee);

    const outputs: CKBComponents.CellOutput[] = [
      {
        lock: genRgbppLockScript(buildRgbppLockArgs(outIndex, btcTxId), isMainnet),
        capacity: append0x(clusterCellCapacity.toString(16)),
      },
    ];
    let changeCapacity = sumInputsCapacity - clusterCellCapacity;
    outputs.push({
      lock: masterLock,
      capacity: append0x(changeCapacity.toString(16)),
    });
    const outputsData = ['0x', '0x'];

    const emptyWitness = { lock: '', inputType: '', outputType: '' };
    const witnesses = inputs.map((_, index) => (index === 0 ? emptyWitness : '0x'));

    const cellDeps = [getSecp256k1CellDep(isMainnet)];

    const unsignedTx = {
      version: '0x0',
      cellDeps,
      headerDeps: [],
      inputs,
      outputs,
      outputsData,
      witnesses,
    };

    const txSize = getTransactionSize(unsignedTx) + SECP256K1_WITNESS_LOCK_SIZE;
    const estimatedTxFee = calculateTransactionFee(txSize);
    changeCapacity -= estimatedTxFee;
    unsignedTx.outputs[unsignedTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

    const signedTx = collector.getCkb().signTransaction(CKB_PRIVATE_KEY)(unsignedTx);
    const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

    console.info(`Cluster cell has been prepared and the tx hash ${txHash}`);
    console.info(`explorer: https://pudge.explorer.nervos.org/transaction/${txHash}`);
  });
};

// Please use your real BTC UTXO information on the BTC Testnet
prepareClusterCell({
  outIndex: readStepLog('prepare-utxo').index,
  btcTxId: readStepLog('prepare-utxo').txid,
});
