import { BtcTransferVirtualTxResult, RgbppCkbVirtualTx, RgbppLaunchCkbVirtualTxParams } from '../types/rgbpp';
import { NoLiveCellError } from '../error';
import {
  append0x,
  calculateRgbppCellCapacity,
  calculateTokenInfoCellCapacity,
  calculateTransactionFee,
  generateUniqueTypeArgs,
} from '../utils';
import { buildPreLockArgs, calculateCommitment, encodeRgbppTokenInfo, genRgbppLockScript } from '../utils/rgbpp';
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
} from '../constants';
import { getTransactionSize, scriptToHash } from '@nervosnetwork/ckb-sdk-utils';

/**
 * Generate the virtual ckb transaction for the btc transfer tx
 * @param collector The collector that collects CKB live cells and transactions
 * @param ownerRgbppLockArgs The owner RGBPP lock args whose data structure is: out_index | bitcoin_tx_id
 * @param launchAmount The total amount of RGBPP assets issued
 * @param rgbppTokenInfo The RGBPP token info https://github.com/ckb-cell/unique-cell?tab=readme-ov-file#xudt-information
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 3000(It can make most scenarios work properly)
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
}: RgbppLaunchCkbVirtualTxParams): Promise<BtcTransferVirtualTxResult> => {
  const ownerLock = genRgbppLockScript(ownerRgbppLockArgs, isMainnet);
  const emptyCells = await collector.getCells({ lock: ownerLock });
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellError('The owner address has no empty cells');
  }
  const rgbppCellCapacity = calculateRgbppCellCapacity();
  const infoCellCapacity = calculateTokenInfoCellCapacity(ownerLock, rgbppTokenInfo);

  let txFee = MAX_FEE;
  const { inputs, sumInputsCapacity } = collector.collectInputs(
    emptyCells,
    rgbppCellCapacity + infoCellCapacity,
    txFee,
  );

  let changeCapacity = sumInputsCapacity - rgbppCellCapacity - infoCellCapacity;
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
      lock: ownerLock,
      type: {
        ...getUniqueTypeScript(isMainnet),
        args: generateUniqueTypeArgs(inputs[0], 0),
      },
      capacity: append0x(infoCellCapacity.toString(16)),
    },
    {
      lock: ownerLock,
      capacity: append0x(changeCapacity.toString(16)),
    },
  ];

  const outputsData = [append0x(launchAmount.toString(16)), encodeRgbppTokenInfo(rgbppTokenInfo), '0x'];
  const cellDeps = [getRgbppLockDep(isMainnet), getXudtDep(isMainnet), getUniqueTypeDep(isMainnet)];

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
  changeCapacity -= estimatedTxFee;
  ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  const virtualTx: RgbppCkbVirtualTx = {
    ...ckbRawTx,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
    needPaymasterCell: false,
    sumInputsCapacity: append0x(sumInputsCapacity.toString(16)),
  };
};
