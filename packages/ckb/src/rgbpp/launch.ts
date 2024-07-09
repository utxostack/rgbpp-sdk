import { RgbppCkbVirtualTx, RgbppLaunchCkbVirtualTxParams, RgbppLaunchVirtualTxResult } from '../types/rgbpp.js';
import { NoLiveCellError } from '../error/index.js';
import {
  append0x,
  calculateRgbppTokenInfoCellCapacity,
  calculateTransactionFee,
  fetchTypeIdCellDeps,
  generateUniqueTypeArgs,
  u128ToLe,
  getTransactionSize,
  scriptToHash,
  buildPreLockArgs,
  calculateCommitment,
  encodeRgbppTokenInfo,
  genBtcTimeLockScript,
  genRgbppLockScript,
} from '../utils/index.js';
import { Hex } from '../types/index.js';
import {
  MAX_FEE,
  RGBPP_TX_WITNESS_MAX_SIZE,
  RGBPP_WITNESS_PLACEHOLDER,
  getXudtTypeScript,
  getUniqueTypeScript,
  UNLOCKABLE_LOCK_SCRIPT,
} from '../constants/index.js';

/**
 * Generate the virtual ckb transaction for the btc transfer tx
 * @param collector The collector that collects CKB live cells and transactions
 * @param ownerRgbppLockArgs The owner RGBPP lock args whose data structure is: out_index | bitcoin_tx_id
 * @param launchAmount The total amount of RGBPP assets issued
 * @param rgbppTokenInfo The RGBPP token info https://github.com/ckb-cell/unique-cell?tab=readme-ov-file#xudt-information
 * @param isMainnet True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet(see btcTestnetType for details about BTC Testnet)
 * @param witnessLockPlaceholderSize(Optional) The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate(Optional) The CKB transaction fee rate, default value is 1100
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const genRgbppLaunchCkbVirtualTx = async ({
  collector,
  ownerRgbppLockArgs,
  launchAmount,
  rgbppTokenInfo,
  witnessLockPlaceholderSize,
  ckbFeeRate,
  isMainnet,
  btcTestnetType,
}: RgbppLaunchCkbVirtualTxParams): Promise<RgbppLaunchVirtualTxResult> => {
  const ownerLock = genRgbppLockScript(ownerRgbppLockArgs, isMainnet, btcTestnetType);
  let emptyCells = await collector.getCells({ lock: ownerLock });
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellError('The owner address has no empty cells');
  }
  emptyCells = emptyCells.filter((cell) => !cell.output.type);
  const infoCellCapacity = calculateRgbppTokenInfoCellCapacity(rgbppTokenInfo, isMainnet);

  const txFee = MAX_FEE;
  const { inputs, sumInputsCapacity } = collector.collectInputs(emptyCells, infoCellCapacity, txFee);

  let rgbppCellCapacity = sumInputsCapacity - infoCellCapacity;
  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: genRgbppLockScript(buildPreLockArgs(1), isMainnet, btcTestnetType),
      type: {
        ...getXudtTypeScript(isMainnet),
        args: append0x(scriptToHash(ownerLock)),
      },
      capacity: append0x(rgbppCellCapacity.toString(16)),
    },
    {
      lock: genBtcTimeLockScript(UNLOCKABLE_LOCK_SCRIPT, isMainnet, btcTestnetType),
      type: {
        ...getUniqueTypeScript(isMainnet),
        args: generateUniqueTypeArgs(inputs[0], 1),
      },
      capacity: append0x(infoCellCapacity.toString(16)),
    },
  ];

  const outputsData = [append0x(u128ToLe(launchAmount)), encodeRgbppTokenInfo(rgbppTokenInfo)];
  const cellDeps = await fetchTypeIdCellDeps(isMainnet, { rgbpp: true, xudt: true, unique: true }, btcTestnetType);

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
    needPaymasterCell: false,
  };
};
