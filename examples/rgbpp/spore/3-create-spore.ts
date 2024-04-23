import {
  Collector,
  buildRgbppLockArgs,
  appendCkbTxWitnesses,
  updateCkbTxWithRealBtcTxId,
  sendCkbTx,
  genCreateSporeCkbVirtualTx,
  Hex,
  appendIssuerCellToSporesCreate,
  generateSporeCreateCoBuild,
} from '@rgbpp-sdk/ckb';
import { DataSource, ECPair, bitcoin, NetworkType, sendRgbppUtxos, transactionToHex, utf8ToBuffer } from '@rgbpp-sdk/btc';
import { BtcAssetsApi, BtcAssetsApiError } from '@rgbpp-sdk/service';
import { RawSporeData } from '@spore-sdk/core'
import { AddressPrefix, privateKeyToAddress } from '@nervosnetwork/ckb-sdk-utils';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
// BTC SECP256K1 private key
const BTC_TEST_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001';
// API docs: https://btc-assets-api.testnet.mibao.pro/docs
const BTC_ASSETS_API_URL = 'https://btc-assets-api.testnet.mibao.pro';
// https://btc-assets-api.testnet.mibao.pro/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = '';

const BTC_ASSETS_ORIGIN = 'https://btc-test.app';

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

   const ckbAddress = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, {
     prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
   });
   console.log('ckb address: ', ckbAddress);

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

  const ckbVirtualTxResult = await genCreateSporeCkbVirtualTx({
    collector,
    sporeDataList: receivers.map((receiver) => receiver.sporeData),
    clusterRgbppLockArgs,
    isMainnet,
    ckbFeeRate: BigInt(5000),
  });

  const { commitment, ckbRawTx, sumInputsCapacity, clusterCell } = ckbVirtualTxResult;

  // Send BTC tx
  // The first btc address is the owner of the cluster cell and the rest btc addresses are spore receivers
  const btcTos = [btcAddress!, ...receivers.map((receiver) => receiver.toBtcAddress)];
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: btcTos,
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
      console.log('The new cluster lock args: ', newCkbRawTx.outputs[0].lock.args);

      const ckbTx = await appendCkbTxWitnesses({
        ckbRawTx: newCkbRawTx,
        btcTxBytes,
        rgbppApiSpvProof,
      });

      // Replace cobuild witness with the final rgbpp lock script
      ckbTx.witnesses[ckbTx.witnesses.length - 1] = generateSporeCreateCoBuild({
        // The first output is cluster cell and the rest of the outputs are spore cells
        sporeOutputs: ckbTx.outputs.slice(1),
        sporeOutputsData: ckbTx.outputsData.slice(1),
        clusterCell,
        clusterOutputCell: ckbTx.outputs[0]
      }
      );

      // console.log('ckbTx: ', JSON.stringify(ckbTx));

      const signedTx = await appendIssuerCellToSporesCreate({
        secp256k1PrivateKey: CKB_TEST_PRIVATE_KEY,
        issuerAddress: ckbAddress,
        ckbRawTx: ckbTx,
        collector,
        sumInputsCapacity,
        isMainnet,
      });

      const txHash = await sendCkbTx({ collector, signedTx });
      console.info(`RGB++ Spore has been created and tx hash is ${txHash}`);
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
  // The cluster rgbpp lock args is from 2-create-cluster.ts
  clusterRgbppLockArgs: buildRgbppLockArgs(1, 'f7176d8715d8f7e0fa439e69076a673fa480b19b789035c23cde994722ba4244'),
  receivers: [
    {
      toBtcAddress: 'tb1qhp9fh9qsfeyh0yhewgu27ndqhs5qlrqwau28m7',
      sporeData: {
        contentType: 'text/plain',
        content: utf8ToBuffer('First Spore'),
        // The cluster id is from 2-create-cluster.ts
        clusterId: '0xbc5168a4f90116fada921e185d4b018e784dc0f6266e539a3c092321c932700a',
      },
    },
    {
      toBtcAddress: 'tb1qhp9fh9qsfeyh0yhewgu27ndqhs5qlrqwau28m7',
      sporeData: {
        contentType: 'text/plain',
        content: utf8ToBuffer('Second Spore'),
        // The cluster id is from 2-create-cluster.ts
        clusterId: '0xbc5168a4f90116fada921e185d4b018e784dc0f6266e539a3c092321c932700a',
      },
    },
  ],
});
