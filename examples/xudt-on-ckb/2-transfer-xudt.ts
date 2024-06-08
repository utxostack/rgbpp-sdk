import { addressToScript, getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';
import {
  getSecp256k1CellDep,
  RgbppTokenInfo,
  NoLiveCellError,
  calculateUdtCellCapacity,
  MAX_FEE,
  MIN_CAPACITY,
  append0x,
  u128ToLe,
  SECP256K1_WITNESS_LOCK_SIZE,
  calculateTransactionFee,
  NoXudtLiveCellError,
  fetchTypeIdCellDeps,
} from 'rgbpp/ckb';
import { CKB_PRIVATE_KEY, ckbAddress, collector, isMainnet } from './env';

interface XudtTransferParams {
  xudtType: CKBComponents.Script;
  receivers: {
    toAddress: string;
    transferAmount: bigint;
  }[];
}

/**
 * transferXudt can be used to mint xUDT assets or transfer xUDT assets.
 * @param xudtType The xUDT type script that comes from 1-issue-xudt
 * @param receivers The receiver includes toAddress and transferAmount
 */
const transferXudt = async ({ xudtType, receivers }: XudtTransferParams) => {
  const fromLock = addressToScript(ckbAddress);

  const xudtCells = await collector.getCells({
    lock: fromLock,
    type: xudtType,
  });
  if (!xudtCells || xudtCells.length === 0) {
    throw new NoXudtLiveCellError('The address has no xudt cells');
  }
  const sumTransferAmount = receivers
    .map((receiver) => receiver.transferAmount)
    .reduce((prev, current) => prev + current, BigInt(0));

  const {
    inputs: udtInputs,
    sumInputsCapacity: sumXudtInputsCapacity,
    sumAmount,
  } = collector.collectUdtInputs({
    liveCells: xudtCells,
    needAmount: sumTransferAmount,
  });
  let actualInputsCapacity = sumXudtInputsCapacity;
  let inputs = udtInputs;

  const xudtCapacity = calculateUdtCellCapacity(fromLock);
  let sumXudtoutputCapacity = xudtCapacity * BigInt(receivers.length);

  const outputs: CKBComponents.CellOutput[] = receivers.map((receiver) => ({
    lock: addressToScript(receiver.toAddress),
    type: xudtType,
    capacity: append0x(xudtCapacity.toString(16)),
  }));
  const outputsData = receivers.map((receiver) => append0x(u128ToLe(receiver.transferAmount)));

  if (sumAmount > sumTransferAmount) {
    outputs.push({
      lock: fromLock,
      type: xudtType,
      capacity: append0x(xudtCapacity.toString(16)),
    });
    outputsData.push(append0x(u128ToLe(sumAmount - sumTransferAmount)));
    sumXudtoutputCapacity += xudtCapacity;
  }

  const txFee = MAX_FEE;
  if (sumXudtInputsCapacity <= sumXudtoutputCapacity) {
    let emptyCells = await collector.getCells({
      lock: fromLock,
    });
    if (!emptyCells || emptyCells.length === 0) {
      throw new NoLiveCellError('The address has no empty cells');
    }
    emptyCells = emptyCells.filter((cell) => !cell.output.type);
    const needCapacity = sumXudtoutputCapacity - sumXudtInputsCapacity;
    const { inputs: emptyInputs, sumInputsCapacity: sumEmptyCapacity } = collector.collectInputs(
      emptyCells,
      needCapacity,
      txFee,
      { minCapacity: MIN_CAPACITY },
    );
    inputs = [...inputs, ...emptyInputs];
    actualInputsCapacity += sumEmptyCapacity;
  }

  let changeCapacity = actualInputsCapacity - sumXudtoutputCapacity;
  outputs.push({
    lock: fromLock,
    capacity: append0x(changeCapacity.toString(16)),
  });
  outputsData.push('0x');

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const witnesses = inputs.map((_, index) => (index === 0 ? emptyWitness : '0x'));

  const cellDeps = [getSecp256k1CellDep(isMainnet), ...(await fetchTypeIdCellDeps(isMainnet, { xudt: true }))];

  const unsignedTx = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  if (txFee === MAX_FEE) {
    const txSize = getTransactionSize(unsignedTx) + SECP256K1_WITNESS_LOCK_SIZE;
    const estimatedTxFee = calculateTransactionFee(txSize);
    changeCapacity -= estimatedTxFee;
    unsignedTx.outputs[unsignedTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));
  }

  const signedTx = collector.getCkb().signTransaction(CKB_PRIVATE_KEY)(unsignedTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

  console.info(`xUDT asset has been minted or transferred and tx hash is ${txHash}`);
};

const XUDT_TOKEN_INFO: RgbppTokenInfo = {
  decimal: 8,
  name: 'XUDT Test Token',
  symbol: 'XTT',
};

transferXudt({
  // The xudtType comes from 1-issue-xudt
  xudtType: {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '0x562e4e8a2f64a3e9c24beb4b7dd002d0ad3b842d0cc77924328e36ad114e3ebe',
  },
  receivers: [
    {
      toAddress: 'ckt1qyqpyw8j7tlu3v44am8d54066zrzk4vz5lvqat8fpf',
      transferAmount: BigInt(1000) * BigInt(10 ** XUDT_TOKEN_INFO.decimal),
    },
    {
      toAddress: 'ckt1qyqpyw8j7tlu3v44am8d54066zrzk4vz5lvqat8fpf',
      transferAmount: BigInt(2000) * BigInt(10 ** XUDT_TOKEN_INFO.decimal),
    },
  ],
});
