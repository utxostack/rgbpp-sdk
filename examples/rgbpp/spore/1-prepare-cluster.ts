import { AddressPrefix, addressToScript, getTransactionSize, privateKeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
import {
  Collector,
  MAX_FEE,
  NoLiveCellError,
  SECP256K1_WITNESS_LOCK_SIZE,
  append0x,
  buildRgbppLockArgs,
  calculateRgbppClusterCellCapacity,
  calculateTransactionFee,
  genRgbppLockScript,
  getSecp256k1CellDep,
} from '@rgbpp-sdk/ckb';
import { CLUSTER_DATA } from './0-cluster-info';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

const prepareClusterCell = async ({
  outIndex,
  btcTxId,
}: {
  outIndex: number;
  btcTxId: string;
}) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const isMainnet = false;
  const address = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, {
    prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
  });
  const masterLock = addressToScript(address);
  console.log('ckb address: ', address);

  // The capacity required to launch cells is determined by the token info cell capacity, and transaction fee.
  // Considering that spore sdk must have change, more capacity is needed
  const clusterCellCapacity = calculateRgbppClusterCellCapacity(CLUSTER_DATA) * BigInt(2);

  let emptyCells = await collector.getCells({
    lock: masterLock,
  });
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellError('The address has no empty cells');
  }
  emptyCells = emptyCells.filter((cell) => !cell.output.type);

  let txFee = MAX_FEE;
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

  console.log(JSON.stringify(unsignedTx));

  const txSize = getTransactionSize(unsignedTx) + SECP256K1_WITNESS_LOCK_SIZE;
  const estimatedTxFee = calculateTransactionFee(txSize);
  changeCapacity -= estimatedTxFee;
  unsignedTx.outputs[unsignedTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  const signedTx = collector.getCkb().signTransaction(CKB_TEST_PRIVATE_KEY)(unsignedTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

  console.info(`Cluster cell has been prepared and the tx hash ${txHash}`);
};

prepareClusterCell({
  outIndex: 1,
  btcTxId: '2341bbc300ffca85031dfc1dee99580331165ba617d97ad11cb1c614de8c76ec',
});
