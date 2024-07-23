import { addressToScript, getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';
import {
  getSecp256k1CellDep,
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
  calculateRgbppCellCapacity,
  getBtcTimeLockScript,
  genBtcTimeLockArgs,
  getXudtTypeScript,
} from 'rgbpp/ckb';
import { CKB_PRIVATE_KEY, ckbAddress, collector, isMainnet } from './env';

interface BtcTimeCellParams {
  xudtType: CKBComponents.Script;
  toCkbAddress: string;
  xudtAmount: bigint;
  btcTxId: string;
  after: number;
}

/**
 * Generate btc time cell with custom btc txid, after and target lock script
 * @param xudtType The xUDT type script that comes from 1-issue-xudt or 2-transfer-xudt
 * BTC time lock args:
 * table BTCTimeLock {
    to_lock_script: Script,
    after: Uint32,
    btc_txid: Byte32,
  }
 */
const generateBtcTimeCell = async ({ xudtType, toCkbAddress, xudtAmount, btcTxId, after }: BtcTimeCellParams) => {
  const fromLock = addressToScript(ckbAddress);

  const xudtCells = await collector.getCells({
    lock: fromLock,
    type: xudtType,
  });
  if (!xudtCells || xudtCells.length === 0) {
    throw new NoXudtLiveCellError('The address has no xudt cells');
  }

  const btcTimeOutputCapacity = calculateRgbppCellCapacity(xudtType);
  let sumXudtOutputCapacity = btcTimeOutputCapacity;

  const {
    inputs: udtInputs,
    sumInputsCapacity: sumXudtInputsCapacity,
    sumAmount,
  } = collector.collectUdtInputs({
    liveCells: xudtCells,
    needAmount: xudtAmount,
  });
  let actualInputsCapacity = sumXudtInputsCapacity;
  let inputs = udtInputs;

  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: {
        ...getBtcTimeLockScript(isMainnet),
        args: genBtcTimeLockArgs(addressToScript(toCkbAddress), btcTxId, after),
      },
      type: xudtType,
      capacity: append0x(btcTimeOutputCapacity.toString(16)),
    },
  ];
  const outputsData = [append0x(u128ToLe(xudtAmount))];

  if (sumAmount > xudtAmount) {
    const xudtChangeCapacity = calculateUdtCellCapacity(fromLock);
    outputs.push({
      lock: fromLock,
      type: xudtType,
      capacity: append0x(xudtChangeCapacity.toString(16)),
    });
    outputsData.push(append0x(u128ToLe(sumAmount - xudtAmount)));
    sumXudtOutputCapacity += xudtChangeCapacity;
  }

  const txFee = MAX_FEE;
  if (sumXudtInputsCapacity <= sumXudtOutputCapacity) {
    let emptyCells = await collector.getCells({
      lock: fromLock,
    });
    if (!emptyCells || emptyCells.length === 0) {
      throw new NoLiveCellError('The address has no empty cells');
    }
    emptyCells = emptyCells.filter((cell) => !cell.output.type);
    const needCapacity = sumXudtOutputCapacity - sumXudtInputsCapacity;
    const { inputs: emptyInputs, sumInputsCapacity: sumEmptyCapacity } = collector.collectInputs(
      emptyCells,
      needCapacity,
      txFee,
      { minCapacity: MIN_CAPACITY },
    );
    inputs = [...inputs, ...emptyInputs];
    actualInputsCapacity += sumEmptyCapacity;
  }

  let changeCapacity = actualInputsCapacity - sumXudtOutputCapacity;
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

  console.info(`xUDT asset has been transferred to BTC time lock and CKB tx hash is ${txHash}`);
};

generateBtcTimeCell({
  xudtType: {
    ...getXudtTypeScript(isMainnet),
    args: '0x562e4e8a2f64a3e9c24beb4b7dd002d0ad3b842d0cc77924328e36ad114e3ebe',
  },
  toCkbAddress: 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq0e4xk4rmg5jdkn8aams492a7jlg73ue0gc0ddfj',
  xudtAmount: BigInt(1000) * BigInt(10 ** 8),
  btcTxId: '5fe08344a7e7e8be96b17a41ec9f308a5cb472cfb2a3234af86df8233d4dc3ff',
  after: 69000,
});
