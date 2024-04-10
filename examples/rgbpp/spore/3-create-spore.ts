import { Collector, buildRgbppLockArgs, appendCkbTxWitnesses, updateCkbTxWithRealBtcTxId, sendCkbTx, genCreateClusterCkbVirtualTx, getRgbppLockScript, buildPreLockArgs, genRgbppLockScript, genCreateSporeCkbVirtualTx, Hex } from '@rgbpp-sdk/ckb';
import { DataSource, ECPair, bitcoin, NetworkType, sendRgbppUtxos, transactionToHex, utf8ToBuffer } from '@rgbpp-sdk/btc';
import { BtcAssetsApi, BtcAssetsApiError } from '@rgbpp-sdk/service';
import { RawSporeData } from '@spore-sdk/core'
import { scriptToAddress } from '@nervosnetwork/ckb-sdk-utils';

// BTC SECP256K1 private key
const BTC_TEST_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001';
// API docs: https://btc-assets-api.testnet.mibao.pro/docs
const BTC_ASSETS_API_URL = 'https://btc-assets-api.testnet.mibao.pro';
// https://btc-assets-api.testnet.mibao.pro/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = '';

interface Params {
  clusterRgbppLockArgs: Hex;
  receivers: {
    toBtcAddress: string,
    sporeData: RawSporeData
  }[];
}

const createSpore = async ({ clusterRgbppLockArgs, receivers }: Params) => {
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
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, 'https://btc-test.app');
  const source = new DataSource(service, networkType);

  const clusterLock = {
    ...getRgbppLockScript(isMainnet),
    args: clusterRgbppLockArgs,
  };
  const clusterAddress = scriptToAddress(clusterLock);

  const ckbVirtualTxResult = await genCreateSporeCkbVirtualTx({
    sporeParams: {
      data: receivers.map(receiver => receiver.sporeData)[0],
      cluster: {
        // The BTC transaction Vouts[0] for OP_RETURN , Vouts[1] for cluster cell ,and Vouts[2], ... for spore cells
        updateOutput(cell) {
          cell.cellOutput.lock = genRgbppLockScript(buildPreLockArgs(1), isMainnet);
          return cell;
        },
      },
      // The BTC transaction Vouts[0] for OP_RETURN , Vouts[1] for cluster cell ,and Vouts[2], ... for spore cells
      toLock: genRgbppLockScript(buildPreLockArgs(2), isMainnet),
      fromInfos: [clusterAddress],
    },
  });

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: receivers.map(receiver => receiver.toBtcAddress),
    ckbCollector: collector,
    from: btcAddress!,
    source,
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

      const txHash = await sendCkbTx({ collector, signedTx: ckbTx });
      console.info(`RGB++ Cluster has been created and tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 30 * 1000);
};

// Use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
createSpore({
  clusterRgbppLockArgs: buildRgbppLockArgs(301, '92966139a07e1cce77293df58c360c0a64a83dd651a9a831d37bcf34fa6d882b'),
  receivers: [
    {
      toBtcAddress: 'bc1p0ey32x7dwhlx569rh0l5qaxetsfnpvezanrezahelr0t02ytyegssdel0h',
      sporeData: {
        contentType: 'text/plain',
        content: utf8ToBuffer('Hello Spore'),
      },
    },
  ],
});
