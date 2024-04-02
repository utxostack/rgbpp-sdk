import { AddressPrefix, addressToScript, getTransactionSize, privateKeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
import { blockchain } from '@ckb-lumos/base';
import { append0x, buildMintTx, Collector } from 'ckb-omiga';
import { MAX_FEE, MIN_CAPACITY, NoLiveCellError, SECP256K1_WITNESS_LOCK_SIZE, buildPreLockArgs, buildRgbppLockArgs, calculateRgbppCellCapacity, calculateTransactionFee, genRgbppLockScript, getSecp256k1CellDep } from '@rgbpp-sdk/ckb';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

const prepareLaunchCell = async ({
  outIndex,
  btcTxId,
  distributeQuantity,
}: {
  outIndex: number;
  btcTxId: string;
  distributeQuantity: number;
}) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const isMainnet = false;
  const address = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, {
    prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
  });
  const masterLock = addressToScript(address)
  console.log('ckb address: ', address);

  // The capacity required to launch cells is determined by the distributed quantity and change capacity.
  const launchCellCapacity = calculateRgbppCellCapacity() * BigInt(distributeQuantity + 1) + MIN_CAPACITY;

  const emptyCells = await collector.getCells({
    lock: masterLock,
  });
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellError('The address has no empty cells');
  }

  let txFee = MAX_FEE;
  const { inputs, capacity: sumInputsCapacity } = collector.collectInputs(emptyCells, launchCellCapacity, txFee);

  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: genRgbppLockScript(buildRgbppLockArgs(outIndex, btcTxId), isMainnet),
      capacity: append0x(launchCellCapacity.toString(16)),
    },
  ];
  let changeCapacity = sumInputsCapacity - launchCellCapacity;
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
  changeCapacity -= estimatedTxFee
  unsignedTx.outputs[unsignedTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  const signedTx = collector.getCkb().signTransaction(CKB_TEST_PRIVATE_KEY)(unsignedTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

  console.info(`Launch cell has been created and the tx hash ${txHash}`);
};

prepareLaunchCell({
  outIndex: 0,
  btcTxId: '4ff1855b64b309afa19a8b9be3d4da99dcb18b083b65d2d851662995c7d99e7a',
  distributeQuantity: 2
});

