import { buildRgbppLockArgs, getXudtTypeScript } from 'rgbpp/ckb';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genBtcTransferCkbVirtualTx, sendRgbppUtxos } from 'rgbpp';
import { isMainnet, collector, btcAddress, btcKeyPair, btcService, btcDataSource } from '../env';

interface RgbppTransferParams {
  rgbppLockArgsList: string[];
  toBtcAddress: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

const transfer = async ({ rgbppLockArgsList, toBtcAddress, xudtTypeArgs, transferAmount }: RgbppTransferParams) => {
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
    from: btcAddress!,
    source: btcDataSource,
  });
  psbt.signAllInputs(btcKeyPair);
  psbt.finalizeAllInputs();

  const btcTx = psbt.extractTransaction();
  const { txid: btcTxId } = await btcService.sendBtcTransaction(btcTx.toHex());

  console.log('BTC TxId: ', btcTxId);

  await btcService.sendRgbppCkbTransaction({ btc_txid: btcTxId, ckb_virtual_result: ckbVirtualTxResult });

  try {
    const interval = setInterval(async () => {
      const { state, failedReason } = await btcService.getRgbppTransactionState(btcTxId);
      console.log('state', state);
      if (state === 'completed' || state === 'failed') {
        clearInterval(interval);
        if (state === 'completed') {
          const { txhash: txHash } = await btcService.getRgbppTransactionHash(btcTxId);
          console.info(`Rgbpp asset has been transferred on BTC and the related CKB tx hash is ${txHash}`);
        } else {
          console.warn(`Rgbpp CKB transaction failed and the reason is ${failedReason} `);
        }
      }
    }, 30 * 1000);
  } catch (error) {
    console.error(error);
  }
};

// Use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
transfer({
  rgbppLockArgsList: [buildRgbppLockArgs(1, '64252b582aea1249ed969a20385fae48bba35bf1ab9b3df3b0fcddc754ccf592')],
  toBtcAddress: 'tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt',
  xudtTypeArgs: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  transferAmount: BigInt(800_0000_0000),
});
