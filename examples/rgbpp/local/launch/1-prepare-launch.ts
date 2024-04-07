import { AddressPrefix, addressToScript, getTransactionSize, privateKeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
import { Collector, MAX_FEE, NoLiveCellError, RgbppTokenInfo, SECP256K1_WITNESS_LOCK_SIZE, append0x, buildRgbppLockArgs, calculateRgbppCellCapacity, calculateRgbppTokenInfoCellCapacity, calculateTransactionFee, genRgbppLockScript, getSecp256k1CellDep } from '@rgbpp-sdk/ckb';
import { RGBPP_TOKEN_INFO } from './0-rgbpp-token-info';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

const prepareLaunchCell = async ({
  outIndex,
  btcTxId,
  rgbppTokenInfo,
}: {
  outIndex: number;
  btcTxId: string;
  rgbppTokenInfo: RgbppTokenInfo;
}) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://mainnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://mainnet.ckb.dev/indexer',
  });
  const isMainnet = true;
  const address = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, {
    prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
  });
  const masterLock = addressToScript(address);
  console.log('ckb address: ', address);

  // The capacity required to launch cells is determined by the token info cell capacity, and transaction fee.
  const launchCellCapacity =
    calculateRgbppCellCapacity() + calculateRgbppTokenInfoCellCapacity(rgbppTokenInfo, isMainnet);

  const emptyCells = await collector.getCells({
    lock: masterLock,
  });
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellError('The address has no empty cells');
  }

  let txFee = MAX_FEE;
  const { inputs, sumInputsCapacity } = collector.collectInputs(emptyCells, launchCellCapacity, txFee);

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
  changeCapacity -= estimatedTxFee;
  unsignedTx.outputs[unsignedTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  const signedTx = collector.getCkb().signTransaction(CKB_TEST_PRIVATE_KEY)(unsignedTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

  console.info(`Launch cell has been created and the tx hash ${txHash}`);
};

prepareLaunchCell({
  outIndex: 301,
  btcTxId: '92966139a07e1cce77293df58c360c0a64a83dd651a9a831d37bcf34fa6d882b',
  rgbppTokenInfo: RGBPP_TOKEN_INFO,
});

