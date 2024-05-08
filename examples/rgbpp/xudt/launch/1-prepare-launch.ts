import { addressToScript, getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';
import {
  MAX_FEE,
  NoLiveCellError,
  RgbppTokenInfo,
  SECP256K1_WITNESS_LOCK_SIZE,
  append0x,
  buildRgbppLockArgs,
  calculateRgbppCellCapacity,
  calculateRgbppTokenInfoCellCapacity,
  calculateTransactionFee,
  genRgbppLockScript,
  getSecp256k1CellDep,
} from '@rgbpp-sdk/ckb';
import { RGBPP_TOKEN_INFO } from './0-rgbpp-token-info';
import { CKB_PRIVATE_KEY, ckbAddress, collector, isMainnet } from 'examples-core';

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

  let emptyCells = await collector.getCells({
    lock: masterLock,
  });
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellError('The address has no empty cells');
  }
  emptyCells = emptyCells.filter((cell) => !cell.output.type);

  const txFee = MAX_FEE;
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

  const signedTx = collector.getCkb().signTransaction(CKB_PRIVATE_KEY)(unsignedTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

  console.info(`Launch cell has been created and the tx hash ${txHash}`);
};

prepareLaunchCell({
  outIndex: 1,
  btcTxId: '6259ea7852e294afbd2aaf9ccd5c9c1f95087b0b08ba7e47ae35ce31170732bc',
  rgbppTokenInfo: RGBPP_TOKEN_INFO,
});
