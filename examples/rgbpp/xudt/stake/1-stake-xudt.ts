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
import { btcService, CKB_PRIVATE_KEY, ckbAddress, collector, isMainnet } from '../../env';

// txId and block number can be arbitrary; please ensure they match and have been confirmed on the BTC chain.
const TESTNET_BTC_TX_ID = '7285ce57c37b73cd895e82f1ba00a9a299b745828a2221918d29352a0a7ad6d4';
const TESTNET_BTC_BLOCK_NUMBER = 2870964;

// txId and block number can be arbitrary; please ensure they match and have been confirmed on the BTC chain.
const MAINNET_BTC_TX_ID = '91ccc177496ef27cf1896d7cf75f3f8c781bb00c683544ecff6ee369135a2409';
const MAINNET_BTC_BLOCK_NUMBER = 854617;

const ISSUER_CKB_ADDRESS = ckbAddress;
const ISSUER_CELL_CAPACITY = BigInt(150 * 10 ** 8);

interface StakeXudtParams {
  xudtType: CKBComponents.Script;
  toCkbAddress: string;
  xudtAmount: bigint;
  lockDurationInSeconds: number;
}

/**
 * Stake xUDT and lock it for a period of time.
 * @param xudtType The xUDT type script that comes from 1-issue-xudt or 2-transfer-xudt
 * BTC time lock args:
 * table BTCTimeLock {
    to_lock_script: Script,
    after: Uint32,
    btc_txid: Byte32,
  }
 */
const stakeXudt = async ({ xudtType, toCkbAddress, xudtAmount, lockDurationInSeconds }: StakeXudtParams) => {
  const fromLock = addressToScript(ckbAddress);

  const xudtCells = await collector.getCells({
    lock: fromLock,
    type: xudtType,
  });
  if (!xudtCells || xudtCells.length === 0) {
    throw new NoXudtLiveCellError('The address has no xudt cells');
  }

  const btcTimeOutputCapacity = calculateRgbppCellCapacity(xudtType);
  let sumOutputCapacity = btcTimeOutputCapacity;

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

  const btcTxId = isMainnet ? MAINNET_BTC_TX_ID : TESTNET_BTC_TX_ID;

  const btcBlockNumber = isMainnet ? MAINNET_BTC_BLOCK_NUMBER : TESTNET_BTC_BLOCK_NUMBER;
  const { blocks: tipBlockNumber } = await btcService.getBtcBlockchainInfo();
  // For simplicity, assume BTC produces a block every 10 minutes
  const after = tipBlockNumber - btcBlockNumber + Math.ceil(lockDurationInSeconds / (10 * 60));
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
    sumOutputCapacity += xudtChangeCapacity;
  }
  // Pay 150CKB to issuer address to mint another xUDT later
  outputs.push({
    lock: addressToScript(ISSUER_CKB_ADDRESS),
    capacity: append0x(ISSUER_CELL_CAPACITY.toString(16)),
  });
  outputsData.push('0x');
  sumOutputCapacity += ISSUER_CELL_CAPACITY;

  const txFee = MAX_FEE;
  if (sumXudtInputsCapacity <= sumOutputCapacity) {
    let emptyCells = await collector.getCells({
      lock: fromLock,
    });
    if (!emptyCells || emptyCells.length === 0) {
      throw new NoLiveCellError('The address has no empty cells');
    }
    emptyCells = emptyCells.filter((cell) => !cell.output.type);
    const needCapacity = sumOutputCapacity - sumXudtInputsCapacity;
    const { inputs: emptyInputs, sumInputsCapacity: sumEmptyCapacity } = collector.collectInputs(
      emptyCells,
      needCapacity,
      txFee,
      { minCapacity: MIN_CAPACITY },
    );
    inputs = [...inputs, ...emptyInputs];
    actualInputsCapacity += sumEmptyCapacity;
  }

  let changeCapacity = actualInputsCapacity - sumOutputCapacity;
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

  console.info(`xUDT has been staked and CKB tx hash is ${txHash}`);
};

stakeXudt({
  xudtType: {
    ...getXudtTypeScript(isMainnet),
    args: '0x562e4e8a2f64a3e9c24beb4b7dd002d0ad3b842d0cc77924328e36ad114e3ebe',
  },
  toCkbAddress: ckbAddress,
  xudtAmount: BigInt(1000) * BigInt(10 ** 8),
  lockDurationInSeconds: 30 * 60, // 30 minutes
});
