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
import { CKB_PRIVATE_KEY, ckbAddress, collector, isMainnet } from '../../env';
import { readStepLog } from '../../shared/utils';

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
  const { retry } = await import('zx');
  await retry(12, '10s', async () => {
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

    let sumXudtOutputCapacity = receivers
      .map(({ toAddress }) => calculateUdtCellCapacity(addressToScript(toAddress)))
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

    const outputs: CKBComponents.CellOutput[] = receivers.map(({ toAddress }) => ({
      lock: addressToScript(toAddress),
      type: xudtType,
      capacity: append0x(calculateUdtCellCapacity(addressToScript(toAddress)).toString(16)),
    }));
    const outputsData = receivers.map(({ transferAmount }) => append0x(u128ToLe(transferAmount)));

    if (sumAmount > sumTransferAmount) {
      const xudtChangeCapacity = calculateUdtCellCapacity(fromLock);
      outputs.push({
        lock: fromLock,
        type: xudtType,
        capacity: append0x(xudtChangeCapacity.toString(16)),
      });
      outputsData.push(append0x(u128ToLe(sumAmount - sumTransferAmount)));
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

    console.info(`xUDT asset has been minted or transferred and tx hash is ${txHash}`);
    console.info(`explorer: https://pudge.explorer.nervos.org/transaction/${txHash}`);
  });
};

const XUDT_TOKEN_INFO: RgbppTokenInfo = {
  decimal: 8,
  name: 'XUDT Test Token',
  symbol: 'PDD',
};

transferXudt({
  // The xudtType comes from 1-issue-xudt
  xudtType: {
    codeHash: readStepLog('xUDT-type-script').codeHash,
    hashType: readStepLog('xUDT-type-script').hashType,
    args: readStepLog('xUDT-type-script').args,
  },
  receivers: [
    {
      toAddress: 'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqqxtfdmw2e5kzfcz536qrnf6w36kyhpzweupegx46',
      transferAmount: BigInt(1) * BigInt(10 ** XUDT_TOKEN_INFO.decimal),
    },
  ],
});
