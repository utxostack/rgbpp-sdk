import bitcoin from 'bitcoinjs-lib';
import { BtcAssetsApi, DataSource, ECPair, toNetworkType } from '../../src';

export const network = bitcoin.networks.testnet;
export const networkType = toNetworkType(network);

export const service = BtcAssetsApi.fromToken(
  process.env.VITE_SERVICE_URL!,
  process.env.VITE_SERVICE_TOKEN!,
  process.env.VITE_SERVICE_ORIGIN!,
);

export const source = new DataSource(service, networkType);

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
