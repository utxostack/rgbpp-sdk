import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genBtcTransferCkbVirtualTx, sendRgbppUtxos, BtcAssetsApiError } from 'rgbpp';
import {
  appendCkbTxWitnesses,
  buildRgbppLockArgs,
  sendCkbTx,
  getXudtTypeScript,
  updateCkbTxWithRealBtcTxId,
} from 'rgbpp/ckb';
import { isMainnet, collector, btcDataSource, btcService, btcAccount } from '../../env';
import { saveCkbVirtualTxResult } from '../../shared/utils';
import { signAndSendPsbt } from '../../shared/btc-account';

interface RgbppTransferParams {
  rgbppLockArgsList: string[];
  toBtcAddress: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

// Warning: It is not recommended for developers to use local examples unless you understand the entire process of RGB++ transactions.
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

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '2-btc-transfer-local');

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [toBtcAddress],
    ckbCollector: collector,
    from: btcAccount.from,
    fromPubkey: btcAccount.fromPubkey,
    source: btcDataSource,
  });

  const { txId: btcTxId, rawTxHex: btcTxBytes } = await signAndSendPsbt(psbt, btcAccount, btcService);
  console.log('BTC TxId: ', btcTxId);

  // Wait for BTC tx and proof to be ready, and then send isomorphic CKB transactions
  const interval = setInterval(async () => {
    try {
      console.log('Waiting for BTC tx and proof to be ready');
      const rgbppApiSpvProof = await btcService.getRgbppSpvProof(btcTxId, 0);
      clearInterval(interval);
      // Update CKB transaction with the real BTC txId
      const newCkbRawTx = updateCkbTxWithRealBtcTxId({ ckbRawTx, btcTxId, isMainnet });
      const ckbTx = await appendCkbTxWitnesses({
        ckbRawTx: newCkbRawTx,
        btcTxBytes,
        rgbppApiSpvProof,
      });

      const txHash = await sendCkbTx({ collector, signedTx: ckbTx });
      console.info(`RGB++ Asset has been transferred on BTC and the CKB tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 30 * 1000);
};

// Please use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
transfer({
  rgbppLockArgsList: [buildRgbppLockArgs(1, '70b250e2a3cc7a33b47f7a4e94e41e1ee2501ce73b393d824db1dd4c872c5348')],
  toBtcAddress: 'tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt',
  // Please use your own RGB++ asset's xudtTypeArgs
  xudtTypeArgs: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  transferAmount: BigInt(800_0000_0000),
});
