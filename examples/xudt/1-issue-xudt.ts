import { addressToScript, getTransactionSize, scriptToHash } from '@nervosnetwork/ckb-sdk-utils';
import {
  getSecp256k1CellDep,
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
} from '@rgbpp-sdk/ckb';
import { CKB_PRIVATE_KEY, ckbAddress, collector, isMainnet } from './env';

/**
 * issueXudt can be used to issue xUDT assets with unique cell as token info cell.
 * @param xudtTotalAmount The xudtTotalAmount specifies the total amount of asset issuance
 * @param tokenInfo The xUDT token info which includes decimal, name and symbol
 */
const issueXudt = async ({ xudtTotalAmount, tokenInfo }: { xudtTotalAmount: bigint; tokenInfo: RgbppTokenInfo }) => {
  const issueLock = addressToScript(ckbAddress);

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
};

const XUDT_TOKEN_INFO: RgbppTokenInfo = {
  decimal: 8,
  name: 'XUDT Test Token',
  symbol: 'XTT',
};

issueXudt({ xudtTotalAmount: BigInt(2100_0000), tokenInfo: XUDT_TOKEN_INFO });
