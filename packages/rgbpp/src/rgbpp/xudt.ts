import { genBtcTransferCkbVirtualTx, getXudtTypeScript } from '@rgbpp-sdk/ckb';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { sendRgbppUtxos } from '@rgbpp-sdk/btc';
import { RgbppTransferTxParams, RgbppTransferTxResult } from './types';

/**
 * Build the CKB virtual transaction and BTC transaction to be signed for the RGB++ transfer tx
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeArgs The transferred xUDT type script args
 * @param rgbppLockArgsList The RGB++ assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred, if the noMergeOutputCells is true, the transferAmount will be ignored
 * @param fromBtcAddress The sender BTC address
 * @param toBtcAddress The receiver BTC address
 * @param btcDataSource The BTC data source
 * @param isMainnet
 */
export const buildRgbppTransferTx = async ({
  collector,
  xudtTypeArgs,
  rgbppLockArgsList,
  transferAmount,
  fromBtcAddress,
  toBtcAddress,
  btcDataSource,
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
  });

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [toBtcAddress],
    ckbCollector: collector,
    from: fromBtcAddress!,
    source: btcDataSource,
  });

  return {
    ckbVirtualTxResult,
    btcTxHexToSign: psbt.toHex(),
  };
};
