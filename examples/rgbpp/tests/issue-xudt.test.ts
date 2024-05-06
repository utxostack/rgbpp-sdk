import { addressToScript, getTransactionSize, scriptToHash } from '@nervosnetwork/ckb-sdk-utils';
import {
  append0x,
  calculateTransactionFee,
  calculateUdtCellCapacity,
  encodeRgbppTokenInfo,
  generateUniqueTypeArgs,
  getSecp256k1CellDep,
  getUniqueTypeDep,
  getUniqueTypeScript,
  getXudtDep,
  getXudtTypeScript,
  MAX_FEE,
  MIN_CAPACITY,
  NoLiveCellError,
  SECP256K1_WITNESS_LOCK_SIZE,
  u128ToLe,
} from '@rgbpp-sdk/ckb';
import { calculateXudtTokenInfoCellCapacity } from '@rgbpp-sdk/ckb/lib/utils';
import { XUDT_TOKEN_INFO } from './shared/token-info';
import { getDeployVariables, writeStepLog } from './shared/utils';
import { describe, it } from 'vitest';

/**
 * issueXudtTest can be used to issue xUDT assets with unique cell as token info cell.
 * @param: xudtTotalAmount The xudtTotalAmount specifies the total amount of asset issuance
 */
const issueXudtTest = async ({ xudtTotalAmount }: { xudtTotalAmount: bigint }) => {
  const { collector, ckbAddress, isMainnet } = getDeployVariables();
  const issueLock = addressToScript(ckbAddress);

  let emptyCells = await collector.getCells({
    lock: issueLock,
  });
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellError('The address has no empty cells');
  }
  emptyCells = emptyCells.filter((cell) => !cell.output.type);

  const xudtCapacity = calculateUdtCellCapacity(issueLock);
  const xudtInfoCapacity = calculateXudtTokenInfoCellCapacity(XUDT_TOKEN_INFO, issueLock);

  const txFee = MAX_FEE;
  const { inputs, sumInputsCapacity } = collector.collectInputs(emptyCells, xudtCapacity + xudtInfoCapacity, txFee, {
    minCapacity: MIN_CAPACITY,
  });

  const xudtType: CKBComponents.Script = {
    ...getXudtTypeScript(isMainnet),
    args: append0x(scriptToHash(issueLock)),
  };

  console.log('xUDT type script', xudtType);

  writeStepLog('1', {
    codeHash: xudtType.codeHash,
    hashType: xudtType.hashType,
    args: xudtType.args,
  });

  let changeCapacity = sumInputsCapacity - xudtCapacity - xudtInfoCapacity;
  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: issueLock,
      type: xudtType,
      capacity: append0x(xudtCapacity.toString(16)),
    },
    {
      lock: issueLock,
      type: {
        ...getUniqueTypeScript(isMainnet),
        args: generateUniqueTypeArgs(inputs[0], 1),
      },
      capacity: append0x(xudtInfoCapacity.toString(16)),
    },
    {
      lock: issueLock,
      capacity: append0x(changeCapacity.toString(16)),
    },
  ];
  const totalAmount = xudtTotalAmount * BigInt(10 ** XUDT_TOKEN_INFO.decimal);
  const outputsData = [append0x(u128ToLe(totalAmount)), encodeRgbppTokenInfo(XUDT_TOKEN_INFO), '0x'];

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const witnesses = inputs.map((_, index) => (index === 0 ? emptyWitness : '0x'));

  const cellDeps = [getSecp256k1CellDep(isMainnet), getUniqueTypeDep(isMainnet), getXudtDep(isMainnet)];

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

  if (process.env.CKB_PRIVATE_KEY) {
    const signedTx = collector.getCkb().signTransaction(process.env.CKB_PRIVATE_KEY)(unsignedTx);
    const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

    console.info(`xUDT asset has been issued and tx hash is ${txHash}`);
  }
};

describe('issue-xudt', () => {
  it('issue-xudt.test', async () => {
    await issueXudtTest({ xudtTotalAmount: BigInt(2100_0000) });
  }, 500000);
});
