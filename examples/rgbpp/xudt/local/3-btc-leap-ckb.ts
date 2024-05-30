import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genBtcJumpCkbVirtualTx, sendRgbppUtxos, BtcAssetsApiError } from 'rgbpp';
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

interface LeapToCkbParams {
  rgbppLockArgsList: string[];
  toCkbAddress: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

// Warning: It is not recommended for developers to use local examples unless you understand the entire process of RGB++ transactions.
const leapFromBtcToCkb = async ({ rgbppLockArgsList, toCkbAddress, xudtTypeArgs, transferAmount }: LeapToCkbParams) => {
  const xudtType: CKBComponents.Script = {
    ...getXudtTypeScript(isMainnet),
    args: xudtTypeArgs,
  };

  const ckbVirtualTxResult = await genBtcJumpCkbVirtualTx({
    collector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount,
    toCkbAddress,
    isMainnet,
  });

  // Save ckbVirtualTxResult
  saveCkbVirtualTxResult(ckbVirtualTxResult, '3-btc-leap-ckb-local');

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [btcAccount.from],
    ckbCollector: collector,
    from: btcAccount.from,
    fromPubkey: btcAccount.fromPubkey,
    source: btcDataSource,
  });

  const { txId: btcTxId, txHexRaw: btcTxBytes } = await signAndSendPsbt(psbt, btcAccount, btcService);
  console.log('BTC Tx bytes: ', btcTxBytes);
  console.log('BTC TxId: ', btcTxId);
  console.log('ckbRawTx', JSON.stringify(ckbRawTx));

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
      console.info(`RGB++ Asset has been leaped from BTC to CKB and the CKB tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 30 * 1000);
};

// Please use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
leapFromBtcToCkb({
  rgbppLockArgsList: [buildRgbppLockArgs(1, '24e622419156dd3a277a90bcbb40c7117462a18d5329dd1ada320ca8bdfba715')],
  toCkbAddress: 'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9kxr7vy7yknezj0vj0xptx6thk6pwyr0sxamv6q',
  // Please use your own RGB++ xudt asset's xudtTypeArgs
  xudtTypeArgs: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  transferAmount: BigInt(800_0000_0000),
});
