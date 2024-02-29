import bitcoin from 'bitcoinjs-lib';
import { NetworkType, BtcAssetsApi, ECPair } from '../../src';

export const networkType = NetworkType.TESTNET;

export const network = bitcoin.networks.testnet;

export const assetsApi = new BtcAssetsApi(
  process.env.VITE_SERVICE_URL!,
  process.env.VITE_SERVICE_APP!,
  process.env.VITE_SERVICE_DOMAIN!,
  process.env.VITE_SERVICE_TOKEN,
);

export const accounts = {
  charlie: createAccount('8d3c23d340ac0841e6c3b58a9bbccb9a28e94ab444f972cff35736fa2fcf9f3f', network),
};

function createAccount(privateKey: string, _network?: bitcoin.Network) {
  const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), { network: _network });
  const p2wpkh = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network: _network,
  });

  return {
    privateKey,
    keyPair,
    p2wpkh: {
      address: p2wpkh.address!,
      pubkey: p2wpkh.pubkey!,
      data: p2wpkh.data!,
    },
  };
}
