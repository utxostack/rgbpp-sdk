import { genBtcTransferCkbVirtualTx, getXudtTypeScript, serializeScript } from '@rgbpp-sdk/ckb';
import { sendRgbppUtxos } from '@rgbpp-sdk/btc';
import { RgbppTransferTxParams, RgbppTransferTxResult } from './types.js';

/**
 * Build the CKB virtual transaction and BTC transaction to be signed for the RGB++ transfer tx
 * CKB parameters
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeArgs The transferred xUDT type script args
 * @param rgbppLockArgsList The RGB++ assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred, if the noMergeOutputCells is true, the transferAmount will be ignored
 * @param feeRate The CKB transaction fee rate, default value is 1100
 *
 * BTC parameters
 * @param fromAddress The sender BTC address
 * @param fromPubkey The public key of the sender BTC address
 * @param toAddress The receiver BTC address
 * @param dataSource The BTC data source
 * @param feeRate The fee rate of the BTC transaction
 * @param isMainnet True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet(see btcTestnetType for details about BTC Testnet)
 * @param testnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const buildRgbppTransferTx = async ({
  ckb: { collector, xudtTypeArgs, rgbppLockArgsList, transferAmount, feeRate: ckbFeeRate },
  btc,
  isMainnet,
}: RgbppTransferTxParams): Promise<RgbppTransferTxResult> => {
  const xudtType: CKBComponents.Script = {
    ...getXudtTypeScript(isMainnet),
    args: xudtTypeArgs,
  };

  const ckbVirtualTxResult = await genBtcTransferCkbVirtualTx({
    collector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount,
    isMainnet,
    ckbFeeRate,
    btcTestnetType: btc.testnetType,
  });

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [btc.toAddress],
    ckbCollector: collector,
    from: btc.fromAddress!,
    fromPubkey: btc.fromPubkey,
    source: btc.dataSource,
    feeRate: btc.feeRate,
  });

  return {
    ckbVirtualTxResult,
    btcPsbtHex: psbt.toHex(),
  };
};
