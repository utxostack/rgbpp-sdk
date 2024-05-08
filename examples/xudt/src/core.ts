import {
  AddressPrefix,
  addressToScript,
  getTransactionSize,
  privateKeyToAddress,
  scriptToHash,
} from '@nervosnetwork/ckb-sdk-utils';
import {
  getSecp256k1CellDep,
  Collector,
  RgbppTokenInfo,
  NoLiveCellError,
  calculateUdtCellCapacity,
  MAX_FEE,
  MIN_CAPACITY,
  getXudtTypeScript,
  append0x,
  getUniqueTypeScript,
  u128ToLe,
  encodeRgbppTokenInfo,
  getXudtDep,
  getUniqueTypeDep,
  SECP256K1_WITNESS_LOCK_SIZE,
  calculateTransactionFee,
  generateUniqueTypeArgs,
  calculateXudtTokenInfoCellCapacity,
  NoXudtLiveCellError,
} from '@rgbpp-sdk/ckb';

const collector = new Collector({
  ckbNodeUrl: process.env.CKB_NODE_URL!,
  ckbIndexerUrl: process.env.CKB_INDEXER_URL!,
});
const isMainnet = process.env.IS_MAINNET === 'true' ? true : false;
const CKB_PRIVATE_KEY = process.env.CKB_SECP256K1_PRIVATE_KEY!;

export interface IssueResult {
  txHash: string;
  xudtType: CKBComponents.Script;
}

/**
 * issueXudt can be used to issue xUDT assets with unique cell as token info cell.
 * @param xudtTotalAmount The xudtTotalAmount specifies the total amount of asset issuance
 * @param tokenInfo The xUDT token info which includes decimal, name and symbol
 */
export const issueXudt = async ({
  xudtTotalAmount,
  tokenInfo,
}: {
  xudtTotalAmount: bigint;
  tokenInfo: RgbppTokenInfo;
}): Promise<IssueResult> => {
  const issueAddress = privateKeyToAddress(CKB_PRIVATE_KEY, {
    prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
  });
  console.log('ckb address: ', issueAddress);

  const issueLock = addressToScript(issueAddress);

  let emptyCells = await collector.getCells({
    lock: issueLock,
  });
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellError('The address has no empty cells');
  }
  emptyCells = emptyCells.filter((cell) => !cell.output.type);

  const xudtCapacity = calculateUdtCellCapacity(issueLock);
  const xudtInfoCapacity = calculateXudtTokenInfoCellCapacity(tokenInfo, issueLock);

  const txFee = MAX_FEE;
  const { inputs, sumInputsCapacity } = collector.collectInputs(emptyCells, xudtCapacity + xudtInfoCapacity, txFee, {
    minCapacity: MIN_CAPACITY,
  });

  const xudtType: CKBComponents.Script = {
    ...getXudtTypeScript(isMainnet),
    args: append0x(scriptToHash(issueLock)),
  };

  console.log('xUDT type script', xudtType);

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
  const totalAmount = xudtTotalAmount * BigInt(10 ** tokenInfo.decimal);
  const outputsData = [append0x(u128ToLe(totalAmount)), encodeRgbppTokenInfo(tokenInfo), '0x'];

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

  const signedTx = collector.getCkb().signTransaction(CKB_PRIVATE_KEY)(unsignedTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

  console.info(`xUDT asset on CKB has been issued and tx hash is ${txHash}`);

  return { txHash, xudtType };
};

export interface TransferParams {
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
export const transferXudt = async ({ xudtType, receivers }: TransferParams) => {
  const fromAddress = privateKeyToAddress(CKB_PRIVATE_KEY, {
    prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
  });
  console.log('ckb address: ', fromAddress);

  const fromLock = addressToScript(fromAddress);

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
  const sumXudtCapacity = xudtCapacity * BigInt(receivers.length);

  const outputs: CKBComponents.CellOutput[] = receivers.map((receiver) => ({
    lock: addressToScript(receiver.toAddress),
    type: xudtType,
    capacity: append0x(xudtCapacity.toString(16)),
  }));
  const outputsData = receivers.map((receiver) => append0x(u128ToLe(receiver.transferAmount)));

  const txFee = MAX_FEE;
  if (sumXudtInputsCapacity < sumXudtCapacity) {
    let emptyCells = await collector.getCells({
      lock: fromLock,
    });
    if (!emptyCells || emptyCells.length === 0) {
      throw new NoLiveCellError('The address has no empty cells');
    }
    emptyCells = emptyCells.filter((cell) => !cell.output.type);
    const needCapacity = sumXudtCapacity - sumXudtInputsCapacity + xudtCapacity;
    const { inputs: emptyInputs, sumInputsCapacity: sumEmptyCapacity } = collector.collectInputs(
      emptyCells,
      needCapacity,
      txFee,
      { minCapacity: MIN_CAPACITY },
    );
    inputs = [...inputs, ...emptyInputs];
    actualInputsCapacity += sumEmptyCapacity;
  }

  let changeCapacity = actualInputsCapacity - sumXudtCapacity;
  if (sumAmount > sumTransferAmount) {
    outputs.push({
      lock: fromLock,
      type: xudtType,
      capacity: append0x(xudtCapacity.toString(16)),
    });
    outputsData.push(append0x(u128ToLe(sumAmount - sumTransferAmount)));
    changeCapacity -= xudtCapacity;
  }

  outputs.push({
    lock: fromLock,
    type: xudtType,
    capacity: append0x(changeCapacity.toString(16)),
  });
  outputsData.push('0x');

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

  const signedTx = collector.getCkb().signTransaction(CKB_PRIVATE_KEY)(unsignedTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

  console.info(`xUDT asset has been minted or transferred and tx hash is ${txHash}`);

  return txHash;
};
