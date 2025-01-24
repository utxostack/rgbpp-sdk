import { blockchain } from '@ckb-lumos/base';
import {
  BurnUTXOAirdropVirtualTxParams,
  BurnUTXOAirdropVirtualTxResult,
  Hex,
  IndexerCell,
  RgbppCkbVirtualTx,
} from '../types';
import {
  append0x,
  calculateCommitment,
  calculateTransactionFee,
  compareInputs,
  deduplicateList,
  estimateWitnessSize,
  fetchTypeIdCellDeps,
  genRgbppLockScript,
  isScriptEqual,
  throwErrorWhenTxInputsExceeded,
} from '../utils';
import { COMPATIBLE_XUDT_TYPE_SCRIPTS, getSecp256k1CellDep, RGBPP_WITNESS_PLACEHOLDER } from '../constants';
import { NoRgbppLiveCellError, TypeAssetNotSupportedError } from '../error';
import { getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';

export const genBtcBurnUTXOAirdropCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  issuerLockBytes,
  isMainnet,
  witnessLockPlaceholderSize,
  ckbFeeRate,
  btcTestnetType,
  vendorCellDeps,
}: BurnUTXOAirdropVirtualTxParams): Promise<BurnUTXOAirdropVirtualTxResult> => {
  const xudtType = blockchain.Script.unpack(xudtTypeBytes) as CKBComponents.Script;
  // TODO: Replace with UTXO Airdrop, and debug with RUSD now
  const utxoAirdropType = COMPATIBLE_XUDT_TYPE_SCRIPTS[1];
  if (!isScriptEqual(xudtType, utxoAirdropType)) {
    throw new TypeAssetNotSupportedError('The type script asset must not be burned now');
  }
  const deduplicatedLockArgsList = deduplicateList(rgbppLockArgsList);

  const rgbppLocks = deduplicatedLockArgsList.map((args) => genRgbppLockScript(args, isMainnet, btcTestnetType));
  let utxoAirdropCells: IndexerCell[] = [];
  for await (const rgbppLock of rgbppLocks) {
    const cells = await collector.getCells({ lock: rgbppLock, isDataMustBeEmpty: false });
    if (!cells || cells.length === 0) {
      throw new NoRgbppLiveCellError('No rgbpp cells found with the rgbpp lock args');
    }
    utxoAirdropCells = cells.filter((cell) => cell.output.type && isScriptEqual(cell.output.type, utxoAirdropType));
    if (utxoAirdropCells.length === 0) {
      throw new NoRgbppLiveCellError('No UTXO Airdrop Badge cells found with the rgbpp lock args');
    }
  }
  utxoAirdropCells = utxoAirdropCells.sort(compareInputs);
  throwErrorWhenTxInputsExceeded(utxoAirdropCells.length);

  const inputs: CKBComponents.CellInput[] = utxoAirdropCells.map((cell) => ({
    previousOutput: cell.outPoint,
    since: '0x0',
  }));

  const utxoAirdropInputsCapacity = utxoAirdropCells
    .map((cell) => BigInt(cell.output.capacity))
    .reduce((prev, curr) => prev + curr, BigInt(0));
  const sumInputsCapacity = append0x(utxoAirdropInputsCapacity.toString(16));
  // Give all the UTXO Airdrop cell capacity back to issuer
  // and set the type script to null to burn UTXO Airdrop Badge asset
  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: blockchain.Script.unpack(issuerLockBytes),
      capacity: sumInputsCapacity,
    },
  ];
  const outputsData = ['0x'];
  const cellDeps = await fetchTypeIdCellDeps(
    isMainnet,
    {
      rgbpp: true,
      metadata: true,
      compatibleXudtCodeHashes: [xudtType.codeHash],
    },
    btcTestnetType,
    vendorCellDeps,
  );

  // TODO: Debug with RUSD and paymaster cell is not required
  const needPaymasterCell = false;
  if (needPaymasterCell) {
    cellDeps.push(getSecp256k1CellDep(isMainnet));
  }
  const witnesses: Hex[] = [];
  const lockArgsSet: Set<string> = new Set();
  for (const cell of utxoAirdropCells) {
    if (lockArgsSet.has(cell.output.lock.args)) {
      witnesses.push('0x');
    } else {
      lockArgsSet.add(cell.output.lock.args);
      witnesses.push(RGBPP_WITNESS_PLACEHOLDER);
    }
  }

  const ckbRawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  if (!needPaymasterCell) {
    const txSize =
      getTransactionSize(ckbRawTx) + (witnessLockPlaceholderSize ?? estimateWitnessSize(deduplicatedLockArgsList));
    const estimatedTxFee = calculateTransactionFee(txSize, ckbFeeRate);

    const changeCapacity = BigInt(outputs[outputs.length - 1].capacity) - estimatedTxFee;
    ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));
  }

  const virtualTx: RgbppCkbVirtualTx = {
    ...ckbRawTx,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
    needPaymasterCell,
    sumInputsCapacity,
  };
};
