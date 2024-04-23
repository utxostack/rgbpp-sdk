import {
  Collector,
  buildRgbppLockArgs,
  appendCkbTxWitnesses,
  updateCkbTxWithRealBtcTxId,
  sendCkbTx,
  getSporeTypeScript,
  Hex,
  generateSporeTransferCoBuild,
  genTransferSporeCkbVirtualTx,
} from '@rgbpp-sdk/ckb';
import { DataSource, ECPair, bitcoin, NetworkType, sendRgbppUtxos, transactionToHex } from '@rgbpp-sdk/btc';
import { BtcAssetsApi, BtcAssetsApiError } from '@rgbpp-sdk/service';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';

// BTC SECP256K1 private key
const BTC_TEST_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001';
// API docs: https://btc-assets-api.testnet.mibao.pro/docs
const BTC_ASSETS_API_URL = 'https://btc-assets-api.testnet.mibao.pro';
// https://btc-assets-api.testnet.mibao.pro/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = '';

const BTC_ASSETS_ORIGIN = 'https://btc-test.app';

const transferSpore = async ({ sporeRgbppLockArgs, toBtcAddress }: { sporeRgbppLockArgs: Hex; toBtcAddress: string}) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const isMainnet = false;

  const network = isMainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  const keyPair = ECPair.fromPrivateKey(Buffer.from(BTC_TEST_PRIVATE_KEY, 'hex'), { network });
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network,
  });

  console.log('btc address: ', btcAddress);

  const networkType = isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, BTC_ASSETS_ORIGIN);
  const source = new DataSource(service, networkType);

  // The spore type script is from 3-create-spore.ts, you can find it from the ckb tx spore output cell
  const sporeTypeBytes = serializeScript({
    ...getSporeTypeScript(isMainnet),
    args: '0x205fe15af04e59d3ff1ff8e0b0a1e3bc201af406a38964760c24848ed6029b6b',
  });

  const ckbVirtualTxResult = await genTransferSporeCkbVirtualTx({
    collector,
    sporeRgbppLockArgs,
    sporeTypeBytes,
    isMainnet,
    ckbFeeRate: BigInt(5000),
  });

  const { commitment, ckbRawTx, sporeCell } = ckbVirtualTxResult;

  // console.log(JSON.stringify(ckbRawTx))

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [toBtcAddress],
    ckbCollector: collector,
    from: btcAddress!,
    source,
    feeRate: 30,
  });
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  const btcTx = psbt.extractTransaction();
  const btcTxBytes = transactionToHex(btcTx, false);
  const { txid: btcTxId } = await service.sendBtcTransaction(btcTx.toHex());

  console.log('BTC TxId: ', btcTxId);

  const interval = setInterval(async () => {
    try {
      console.log('Waiting for BTC tx and proof to be ready');
      const rgbppApiSpvProof = await service.getRgbppSpvProof(btcTxId, 0);
      clearInterval(interval);
      // Update CKB transaction with the real BTC txId
      const newCkbRawTx = updateCkbTxWithRealBtcTxId({ ckbRawTx, btcTxId, isMainnet });

      const ckbTx = await appendCkbTxWitnesses({
        ckbRawTx: newCkbRawTx,
        btcTxBytes,
        rgbppApiSpvProof,
      });

      // Replace cobuild witness with the final rgbpp lock script
      ckbTx.witnesses[ckbTx.witnesses.length - 1] = generateSporeTransferCoBuild(sporeCell, ckbTx.outputs[0]);

      // console.log('ckbTx: ', JSON.stringify(ckbTx));

      const txHash = await sendCkbTx({ collector, signedTx: ckbTx });
      console.info(`RGB++ Spore has been transferred and tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 30 * 1000);
};

// Use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
transferSpore({
  // The spore rgbpp lock args is from 3-create-spore.ts
  sporeRgbppLockArgs: buildRgbppLockArgs(1, 'f203c8c13eacdbd126f85d286a963c85f233f8145363b1d997c4d552afb990e1'),
  toBtcAddress: 'tb1qhp9fh9qsfeyh0yhewgu27ndqhs5qlrqwau28m7',
});
