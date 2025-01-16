import { sha256 } from 'js-sha256';
import { RgbppApiSpvProof } from '@rgbpp-sdk/service';
import { BTCTestnetType, Hex, IndexerCell, RgbppCkbVirtualTx, RgbppTokenInfo, SpvClientCellTxProof } from '../types';
import { append0x, remove0x, reverseHex, u32ToLe, u8ToHex, utf8ToHex } from './hex';
import {
  BTC_JUMP_CONFIRMATION_BLOCKS,
  RGBPP_TX_ID_PLACEHOLDER,
  RGBPP_TX_INPUTS_MAX_LENGTH,
  RGBPP_TX_WITNESS_MAX_SIZE,
  getBtcTimeLockScript,
  getRgbppLockScript,
} from '../constants';
import { RGBPPLock } from '../schemas/generated/rgbpp';
import { BTCTimeLock } from '../schemas/generated/rgbpp';
import { Script } from '../schemas/generated/blockchain';
import { BytesLike } from '@ckb-lumos/codec';
import { toCamelcase } from './case-parser';
import {
  InputsOrOutputsLenError,
  NoRgbppLiveCellError,
  RgbppCkbTxInputsExceededError,
  RgbppUtxoBindMultiTypeAssetsError,
} from '../error';
import { calculateRgbppCellCapacity, isScriptEqual, isUDTTypeSupported } from './ckb-tx';
import { blockchain } from '@ckb-lumos/base';
import {
  bytesToHex,
  hexToBytes,
  serializeOutPoint,
  serializeOutput,
  serializeScript,
} from '@nervosnetwork/ckb-sdk-utils';
import { HashType } from '../schemas/customized';

export const genRgbppLockScript = (rgbppLockArgs: Hex, isMainnet: boolean, btcTestnetType?: BTCTestnetType) => {
  return {
    ...getRgbppLockScript(isMainnet, btcTestnetType),
    args: append0x(rgbppLockArgs),
  } as CKBComponents.Script;
};

export const genBtcTimeLockArgs = (lock: CKBComponents.Script, btcTxId: Hex, after: number): Hex => {
  const btcTxid = blockchain.Byte32.pack(reverseHex(btcTxId));
  const lockScript = Script.unpack(serializeScript(lock));
  return bytesToHex(BTCTimeLock.pack({ lockScript, after, btcTxid }));
};

/**
 * btcTimeLockArgs: 
 * table BTCTimeLock {
    lock_script: Script,
    after: Uint32,
    btc_txid: Byte32,
  }
 */
export const genBtcTimeLockScript = (
  toLock: CKBComponents.Script,
  isMainnet: boolean,
  btcTestnetType?: BTCTestnetType,
  btcConfirmationBlocks?: number,
) => {
  const args = genBtcTimeLockArgs(
    toLock,
    RGBPP_TX_ID_PLACEHOLDER,
    btcConfirmationBlocks ?? BTC_JUMP_CONFIRMATION_BLOCKS,
  );
  return {
    ...getBtcTimeLockScript(isMainnet, btcTestnetType),
    args,
  } as CKBComponents.Script;
};

// The maximum length of inputs and outputs is 255, and the field type representing the length in the RGB++ protocol is Uint8
const MAX_RGBPP_CELL_NUM = 255;
// refer to https://github.com/ckb-cell/rgbpp/blob/0c090b039e8d026aad4336395b908af283a70ebf/contracts/rgbpp-lock/src/main.rs#L173-L211
export const calculateCommitment = (rgbppVirtualTx: RgbppCkbVirtualTx | CKBComponents.RawTransaction): Hex => {
  const hash = sha256.create();
  hash.update(hexToBytes(utf8ToHex('RGB++')));
  const version = [0, 0];
  hash.update(version);

  const { inputs, outputs, outputsData } = rgbppVirtualTx;

  if (inputs.length > MAX_RGBPP_CELL_NUM || outputs.length > MAX_RGBPP_CELL_NUM) {
    throw new InputsOrOutputsLenError(
      'The inputs or outputs length of RGB++ CKB virtual tx cannot be greater than 255',
    );
  }
  hash.update([inputs.length, outputs.length]);

  for (const input of inputs) {
    hash.update(hexToBytes(serializeOutPoint(input.previousOutput)));
  }
  for (let index = 0; index < outputs.length; index++) {
    const output = outputs[index];
    const outputData = outputsData[index];
    hash.update(hexToBytes(serializeOutput(output)));

    const outputDataLen = u32ToLe(remove0x(outputData).length / 2);
    hash.update(hexToBytes(append0x(outputDataLen)));
    hash.update(hexToBytes(outputData));
  }
  // double sha256
  return sha256(hash.array());
};

/**
 * table BTCTimeLock {
    lock_script: Script,
    after: Uint32,
    btc_txid: Byte32,
  }
 */
export const lockScriptFromBtcTimeLockArgs = (args: Hex): CKBComponents.Script => {
  const { lockScript } = BTCTimeLock.unpack(append0x(args));
  return {
    ...lockScript,
    hashType: HashType.unpack(lockScript.hashType),
  };
};

export interface BTCTimeLockArgs {
  btcTxId: Hex;
  after: number;
}
export const btcTxIdAndAfterFromBtcTimeLockArgs = (args: Hex): BTCTimeLockArgs => {
  const { btcTxid, after } = BTCTimeLock.unpack(append0x(args));
  return {
    btcTxId: reverseHex(append0x(btcTxid)),
    after,
  };
};

/**
 * https://learnmeabitcoin.com/technical/general/byte-order/
 * Whenever you're working with transaction/block hashes internally (e.g. inside raw bitcoin data), you use the natural byte order.
 * Whenever you're displaying or searching for transaction/block hashes, you use the reverse byte order.
 */
export const buildRgbppLockArgs = (outIndex: number, btcTxId: Hex): Hex => {
  return `0x${u32ToLe(outIndex)}${remove0x(reverseHex(btcTxId))}`;
};

export const buildPreLockArgs = (outIndex: number) => {
  return buildRgbppLockArgs(outIndex, RGBPP_TX_ID_PLACEHOLDER);
};

export interface RgbppLockArgs {
  btcTxId: Hex;
  outIndex: number;
}
export const unpackRgbppLockArgs = (source: BytesLike): RgbppLockArgs => {
  const unpacked = RGBPPLock.unpack(source);
  return {
    btcTxId: reverseHex(unpacked.btcTxid),
    outIndex: unpacked.outIndex,
  };
};

export const compareInputs = (a: IndexerCell, b: IndexerCell) => {
  if (a.output.lock.args < b.output.lock.args) {
    return -1;
  }
  if (a.output.lock.args > b.output.lock.args) {
    return 1;
  }
  return 0;
};

/**
 * RGBPP lock args: out_index | bitcoin_tx_id
 * BTC time lock args: lock_script | after | bitcoin_tx_id
 *
 * https://learnmeabitcoin.com/technical/general/byte-order/
 * Whenever you're working with transaction/block hashes internally (e.g. inside raw bitcoin data), you use the natural byte order.
 * Whenever you're displaying or searching for transaction/block hashes, you use the reverse byte order.
 */
const RGBPP_MIN_LOCK_ARGS_SIZE = 36 * 2;
const BTC_TX_ID_SIZE = 32 * 2;
export const replaceLockArgsWithRealBtcTxId = (lockArgs: Hex, txId: Hex): Hex => {
  const argsLength = remove0x(lockArgs).length;
  if (argsLength < RGBPP_MIN_LOCK_ARGS_SIZE) {
    throw new Error('Rgbpp lock args or BTC time lock args length is invalid');
  }
  return `0x${remove0x(lockArgs).substring(0, argsLength - BTC_TX_ID_SIZE)}${remove0x(reverseHex(txId))}`;
};

const BTC_TESTNETS: BTCTestnetType[] = ['Testnet3', 'Signet'];
const isLockEqual = (lock1: CKBComponents.Script, lock2: CKBComponents.Script) =>
  lock1.codeHash === lock2.codeHash && lock1.hashType === lock2.hashType;

export const isRgbppLockCell = (cell: CKBComponents.CellOutput, isMainnet: boolean): boolean => {
  if (isMainnet) {
    return isLockEqual(cell.lock, getRgbppLockScript(isMainnet));
  }
  return BTC_TESTNETS.some((network) => isLockEqual(cell.lock, getRgbppLockScript(isMainnet, network)));
};

export const isRgbppLockCellIgnoreChain = (cell: CKBComponents.CellOutput): boolean => {
  return isRgbppLockCell(cell, true) || isRgbppLockCell(cell, false);
};

export const isBtcTimeLockCell = (cell: CKBComponents.CellOutput, isMainnet: boolean): boolean => {
  if (isMainnet) {
    return isLockEqual(cell.lock, getBtcTimeLockScript(isMainnet));
  }
  return BTC_TESTNETS.some((network) => isLockEqual(cell.lock, getBtcTimeLockScript(isMainnet, network)));
};

export const isRgbppLockOrBtcTimeLock = (lock: CKBComponents.Script, isMainnet: boolean) => {
  if (isMainnet) {
    return isLockEqual(lock, getRgbppLockScript(isMainnet)) || isLockEqual(lock, getBtcTimeLockScript(isMainnet));
  }
  return BTC_TESTNETS.flatMap((network) => [
    getRgbppLockScript(isMainnet, network),
    getBtcTimeLockScript(isMainnet, network),
  ]).some((script) => isLockEqual(script, lock));
};

export const transformSpvProof = (spvProof: RgbppApiSpvProof): SpvClientCellTxProof => {
  return toCamelcase(spvProof) as SpvClientCellTxProof;
};

export const buildSpvClientCellDep = (spvClient: CKBComponents.OutPoint) => {
  const cellDep: CKBComponents.CellDep = {
    outPoint: spvClient,
    depType: 'code',
  };
  return cellDep;
};

/**
 * Estimate the size of the witness based on the number of groups of lock args
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 */
export const estimateWitnessSize = (rgbppLockArgsList: Hex[]): number => {
  const rgbppLockArgsSet = new Set(rgbppLockArgsList);
  const inputsGroupSize = rgbppLockArgsSet.size;
  return RGBPP_TX_WITNESS_MAX_SIZE * inputsGroupSize;
};

/**
 * Encode RGBPP token information into hex format
 * @param tokenInfo RGBPP token information
 * @returns hex string for cell data
 */
export const encodeRgbppTokenInfo = (tokenInfo: RgbppTokenInfo) => {
  const decimal = u8ToHex(tokenInfo.decimal);
  const name = remove0x(utf8ToHex(tokenInfo.name));
  const nameSize = u8ToHex(name.length / 2);
  const symbol = remove0x(utf8ToHex(tokenInfo.symbol));
  const symbolSize = u8ToHex(symbol.length / 2);
  return `0x${decimal}${nameSize}${name}${symbolSize}${symbol}`;
};

export const calculateRgbppTokenInfoSize = (tokenInfo: RgbppTokenInfo): bigint => {
  const encodedTokenInfo = encodeRgbppTokenInfo(tokenInfo);
  return BigInt(remove0x(encodedTokenInfo).length / 2);
};

export const throwErrorWhenTxInputsExceeded = (inputLen: number) => {
  if (inputLen > RGBPP_TX_INPUTS_MAX_LENGTH) {
    throw new RgbppCkbTxInputsExceededError(`Please ensure the tx inputs do not exceed ${RGBPP_TX_INPUTS_MAX_LENGTH}`);
  }
};

// Check the validity of RGB++ cells and throw an exception if the conditions are not met to avoid building invalid CKB TX
export const throwErrorWhenRgbppCellsInvalid = (
  cells: IndexerCell[] | undefined,
  xudtTypeBytes: Hex,
  isMainnet: boolean,
) => {
  if (!cells || cells.length === 0) {
    throw new NoRgbppLiveCellError('No rgbpp cells found with the rgbpp lock args');
  }
  const typeCells = cells.filter((cell) => !!cell.output.type);
  if (typeCells.length === 0) {
    throw new NoRgbppLiveCellError('No rgbpp cells found with the rgbpp lock args');
  }

  const isUDTTypeNotSupported = typeCells.some(
    async (cell) => cell.output.type && !(await isUDTTypeSupported(cell.output.type, isMainnet)),
  );
  if (isUDTTypeNotSupported) {
    throw new RgbppUtxoBindMultiTypeAssetsError(
      'The BTC UTXO must not be bound to xUDT and other type cells at the same time',
    );
  }

  const isTargetExist = typeCells.some((cell) => isScriptEqual(cell.output.type!, xudtTypeBytes));
  if (!isTargetExist) {
    throw new NoRgbppLiveCellError('No rgbpp cells found with the xudt type script and the rgbpp lock args');
  }
};

/**
 * Check if the tx's unoccupied capacity is enough to create a new rgbpp-cell as a UDT change cell
 */
export const isRgbppCapacitySufficientForChange = (
  sumUdtInputsCapacity: bigint,
  receiverOutputCapacity: bigint,
): boolean => {
  const rgbppOccupiedCapacity = calculateRgbppCellCapacity();
  return sumUdtInputsCapacity > receiverOutputCapacity + rgbppOccupiedCapacity;
};
