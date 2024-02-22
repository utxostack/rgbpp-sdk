import ECPairFactory from 'ecpair';
import bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BtcRpc, UniSatOpenApi } from '../../src';

export const ECPair = ECPairFactory(ecc);
export const network = bitcoin.networks.testnet;

export const btcRpc = new BtcRpc(process.env.VITE_BTC_RPC_URL!, process.env.VITE_BTC_RPC_USER!);

export const openApi = new UniSatOpenApi(process.env.VITE_OPENAPI_URL!, process.env.VITE_OPENAPI_KEY!);

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
