import { AddressPrefix, privateKeyToAddress, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { Collector, RgbppBtcAddressReceiver, appendCkbTxWitnesses, appendIssuerCellToBtcBatchTransfer, buildRgbppLockArgs, genBtcBatchTransferCkbVirtualTx, getXudtTypeScript, sendCkbTx, updateCkbTxWithRealBtcTxId } from '@rgbpp-sdk/ckb';
import { sendRgbppUtxos, DataSource, ECPair, bitcoin, NetworkType, transactionToHex } from '@rgbpp-sdk/btc';
import { BtcAssetsApi, BtcAssetsApiError } from '@rgbpp-sdk/service';
import { RGBPP_TOKEN_INFO } from './0-rgbpp-token-info';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
// BTC SECP256K1 private key
const BTC_TEST_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001';
// API docs: https://btc-assets-api.testnet.mibao.pro/docs
const BTC_ASSETS_API_URL = 'https://api.rgbpp.io';
// https://btc-assets-api.testnet.mibao.pro/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = '';

interface Params {
  rgbppLockArgsList: string[];
  receivers: RgbppBtcAddressReceiver[];
}
const distributeRgbppAssetOnBtc = async ({ rgbppLockArgsList, receivers }: Params) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://mainnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://mainnet.ckb.dev/indexer',
  });
  const isMainnet = true;
  const ckbAddress = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, {
    prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
  });
  console.log('ckb address: ', ckbAddress);
  // const fromLock = addressToScript(ckbAddress);

  const network = bitcoin.networks.bitcoin;
  const keyPair = ECPair.fromPrivateKey(Buffer.from(BTC_TEST_PRIVATE_KEY, 'hex'), { network });
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network,
  });

  console.log('btc address: ', btcAddress);

  const networkType = NetworkType.MAINNET;
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, 'https://api.rgbpp.io');
  const source = new DataSource(service, networkType);

  const xudtType: CKBComponents.Script = {
    ...getXudtTypeScript(isMainnet),
    args: '0x4c1ecf2f14edae73b76ccf115ecfa40ba68ee315c96bd4fcfd771c2fb4c69e8f',
  };

  const ckbVirtualTxResult = await genBtcBatchTransferCkbVirtualTx({
    collector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(xudtType),
    rgbppReceivers: receivers,
    isMainnet,
  });

  const { commitment, ckbRawTx, sumInputsCapacity,rgbppChangeOutIndex } = ckbVirtualTxResult;

  console.log('RGB++ asset change out index: ', rgbppChangeOutIndex)

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

      const signedTx = await appendIssuerCellToBtcBatchTransfer({
        secp256k1PrivateKey: CKB_TEST_PRIVATE_KEY,
        issuerAddress: ckbAddress,
        ckbRawTx: ckbTx,
        collector,
        sumInputsCapacity,
        isMainnet
      });

      const txHash = await sendCkbTx({ collector, signedTx });
      console.info(`RGB++ Asset has been distributed and tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      } 
    }
  }, 20 * 1000);
};


// Use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
distributeRgbppAssetOnBtc({
  rgbppLockArgsList: [buildRgbppLockArgs(251, '92966139a07e1cce77293df58c360c0a64a83dd651a9a831d37bcf34fa6d882b')],
  receivers: [
    {
      toBtcAddress: 'bc1p0ey32x7dwhlx569rh0l5qaxetsfnpvezanrezahelr0t02ytyegssdel0h',
      transferAmount: BigInt(1000) * BigInt(10 ** RGBPP_TOKEN_INFO.decimal),
    },
  ],
});

