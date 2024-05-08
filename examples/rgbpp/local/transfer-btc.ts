import { sendBtc, DataSource, NetworkType, bitcoin, ECPair } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

// BTC SECP256K1 private key
const BTC_TEST_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001';
// https://btc-assets-api-develop.vercel.app/docs/static/index.html
const BTC_ASSETS_API_URL = 'https://btc-assets-api.testnet.mibao.pro';
// https://btc-assets-api.testnet.mibao.pro/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = '';

// This example shows how to transfer BTC on testnet
const transferBtc = async () => {
  const network = bitcoin.networks.testnet;
  const keyPair = ECPair.fromPrivateKey(Buffer.from(BTC_TEST_PRIVATE_KEY, 'hex'), { network });
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network,
  });
  console.log('btc address: ', btcAddress);

  const networkType = NetworkType.TESTNET;
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, 'https://btc-test.app');
  const source = new DataSource(service, networkType);

  const psbt = await sendBtc({
    from: btcAddress!, // your P2WPKH address
    tos: [
      {
        address: btcAddress!, // destination btc address
        value: 100000, // transfer satoshi amount
      },
    ],
    feeRate: 1, // optional, default to 1 sat/vbyte
    source,
  });

  // Sign & finalize inputs
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  // Broadcast transaction
  const tx = psbt.extractTransaction();
  const { txid: txId } = await service.sendBtcTransaction(tx.toHex());
  console.log('txId:', txId);
};

transferBtc();
