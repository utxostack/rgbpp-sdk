import { genBtcTransferCkbVirtualTx, getXudtTypeScript } from '@rgbpp-sdk/ckb';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { sendRgbppUtxos } from '@rgbpp-sdk/btc';
import { RgbppTransferTxParams, RgbppTransferTxResult } from './types';

/**
 * Build the CKB virtual transaction and BTC transaction to be signed for the RGB++ transfer tx
 * CKB parameters
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeArgs The transferred xUDT type script args
 * @param rgbppLockArgsList The RGB++ assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred, if the noMergeOutputCells is true, the transferAmount will be ignored
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 *
 * BTC pramaeters
 * @param fromBtcAddress The sender BTC address
 * @param fromPubkey The public key of the sender BTC address
 * @param toBtcAddress The receiver BTC address
 * @param btcDataSource The BTC data source
 * @param feeRate The fee rate of the BTC transaction
 * @param isMainnet
 */
export const buildRgbppTransferTx = async ({
  ckb: { collector, xudtTypeArgs, rgbppLockArgsList, transferAmount, ckbFeeRate },
  btc: { fromBtcAddress, toBtcAddress, btcDataSource, fromPubkey, feeRate },
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
  });

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [toBtcAddress],
    ckbCollector: collector,
    from: fromBtcAddress!,
    fromPubkey,
    source: btcDataSource,
    feeRate,
  });

  return {
    ckbVirtualTxResult,
    btcPsbtHex: psbt.toHex(),
  };
};
