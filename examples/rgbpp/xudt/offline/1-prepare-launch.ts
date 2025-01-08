import { addressToScript, getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';
import {
  MAX_FEE,
  RgbppTokenInfo,
  SECP256K1_WITNESS_LOCK_SIZE,
  append0x,
  buildRgbppLockArgs,
  calculateRgbppCellCapacity,
  calculateRgbppTokenInfoCellCapacity,
  calculateTransactionFee,
  genRgbppLockScript,
  getSecp256k1CellDep,
} from 'rgbpp/ckb';
import { RGBPP_TOKEN_INFO } from './0-rgbpp-token-info';
import {
  BTC_TESTNET_TYPE,
  CKB_PRIVATE_KEY,
  ckbAddress,
  collector,
  initOfflineCkbCollector,
  isMainnet,
} from '../../env';

const prepareLaunchCell = async ({
  outIndex,
  btcTxId,
  rgbppTokenInfo,
}: {
  outIndex: number;
  btcTxId: string;
  rgbppTokenInfo: RgbppTokenInfo;
}) => {
  const masterLock = addressToScript(ckbAddress);
  console.log('ckb address: ', ckbAddress);

  // The capacity required to launch cells is determined by the token info cell capacity, and transaction fee.
  const launchCellCapacity =
    calculateRgbppCellCapacity() + calculateRgbppTokenInfoCellCapacity(rgbppTokenInfo, isMainnet);

  const { collector: offlineCollector, cells: emptyCells } = await initOfflineCkbCollector([{ lock: masterLock }]);

  const txFee = MAX_FEE;
  const { inputs, sumInputsCapacity } = offlineCollector.collectInputs(emptyCells, launchCellCapacity, txFee);

  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: genRgbppLockScript(buildRgbppLockArgs(outIndex, btcTxId), isMainnet, BTC_TESTNET_TYPE),
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

  const signedTx = collector.getCkb().signTransaction(CKB_PRIVATE_KEY)(unsignedTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

  console.info(`Launch cell has been created and the CKB tx hash ${txHash}`);
};

prepareLaunchCell({
  outIndex: 2,
  btcTxId: '8ae0e7c4834ee409815a56774ec4cf9dc9d14851f3587c01e67f6086f07454ac',
  rgbppTokenInfo: RGBPP_TOKEN_INFO,
});

/* 
npx tsx examples/rgbpp/xudt/offline/1-prepare-launch.ts
*/
