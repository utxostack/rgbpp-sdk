import { RgbppCkbVirtualTx, RgbppLaunchCkbVirtualTxParams, RgbppLaunchVirtualTxResult } from '../types/rgbpp';
import { NoLiveCellError } from '../error';
import {
  append0x,
  calculateRgbppCellCapacity,
  calculateRgbppTokenInfoCellCapacity,
  calculateTransactionFee,
  generateUniqueTypeArgs,
  u128ToLe,
} from '../utils';
import {
  buildPreLockArgs,
  calculateCommitment,
  encodeRgbppTokenInfo,
  genBtcTimeLockScript,
  genRgbppLockScript,
} from '../utils/rgbpp';
import { Hex } from '../types';
import {
  MAX_FEE,
  RGBPP_TX_WITNESS_MAX_SIZE,
  RGBPP_WITNESS_PLACEHOLDER,
  getRgbppLockDep,
  getXudtDep,
  getXudtTypeScript,
  getUniqueTypeScript,
  getUniqueTypeDep,
  UNLOCKABLE_LOCK_SCRIPT,
  getRgbppLockConfigDep,
} from '../constants';
import { getTransactionSize, scriptToHash } from '@nervosnetwork/ckb-sdk-utils';

/**
 * Generate the virtual ckb transaction for the btc transfer tx
 * @param collector The collector that collects CKB live cells and transactions
 * @param ownerRgbppLockArgs The owner RGBPP lock args whose data structure is: out_index | bitcoin_tx_id
 * @param launchAmount The total amount of RGBPP assets issued
 * @param rgbppTokenInfo The RGBPP token info https://github.com/ckb-cell/unique-cell?tab=readme-ov-file#xudt-information
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 * @param isMainnet
 */
export const genRgbppLaunchCkbVirtualTx = async ({
  collector,
  ownerRgbppLockArgs,
  launchAmount,
  rgbppTokenInfo,
  witnessLockPlaceholderSize,
  ckbFeeRate,
  isMainnet,
}: RgbppLaunchCkbVirtualTxParams): Promise<RgbppLaunchVirtualTxResult> => {
  const ownerLock = genRgbppLockScript(ownerRgbppLockArgs, isMainnet);
  const emptyCells = await collector.getCells({ lock: ownerLock });
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellError('The owner address has no empty cells');
  }
  const infoCellCapacity = calculateRgbppTokenInfoCellCapacity(rgbppTokenInfo, isMainnet);

  let txFee = MAX_FEE;
  const { inputs, sumInputsCapacity } = collector.collectInputs(emptyCells, infoCellCapacity, txFee, { isMax: true });

  let rgbppCellCapacity = sumInputsCapacity - infoCellCapacity;
  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: genRgbppLockScript(buildPreLockArgs(1), isMainnet),
      type: {
        ...getXudtTypeScript(isMainnet),
        args: append0x(scriptToHash(ownerLock)),
      },
      capacity: append0x(rgbppCellCapacity.toString(16)),
    },
    {
      lock: genBtcTimeLockScript(UNLOCKABLE_LOCK_SCRIPT, isMainnet),
      type: {
        ...getUniqueTypeScript(isMainnet),
        args: generateUniqueTypeArgs(inputs[0], 1),
      },
      capacity: append0x(infoCellCapacity.toString(16)),
    },
  ];

  const outputsData = [append0x(u128ToLe(launchAmount)), encodeRgbppTokenInfo(rgbppTokenInfo)];
  const cellDeps = [
    getRgbppLockDep(isMainnet),
    getRgbppLockConfigDep(isMainnet),
    getXudtDep(isMainnet),
    getUniqueTypeDep(isMainnet),
  ];

  const witnesses: Hex[] = inputs.map((_, index) => (index === 0 ? RGBPP_WITNESS_PLACEHOLDER : '0x'));

  const ckbRawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  const txSize = getTransactionSize(ckbRawTx) + (witnessLockPlaceholderSize ?? RGBPP_TX_WITNESS_MAX_SIZE);
  const estimatedTxFee = calculateTransactionFee(txSize, ckbFeeRate);
  rgbppCellCapacity -= estimatedTxFee;
  ckbRawTx.outputs[0].capacity = append0x(rgbppCellCapacity.toString(16));

  const virtualTx: RgbppCkbVirtualTx = {
    ...ckbRawTx,
    outputs: ckbRawTx.outputs,
  };

  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
  };
};
