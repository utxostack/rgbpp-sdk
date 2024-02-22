import bitcoin from 'bitcoinjs-lib';

export enum NetworkType {
  MAINNET,
  TESTNET,
  REGTEST,
}

/**
 * Convert network type to bitcoinjs-lib network.
 */
export function toPsbtNetwork(networkType: NetworkType): bitcoin.Network {
  if (networkType === NetworkType.MAINNET) {
    return bitcoin.networks.bitcoin;
  } else if (networkType === NetworkType.TESTNET) {
    return bitcoin.networks.testnet;
  } else {
    return bitcoin.networks.regtest;
  }
}

/**
 * Convert bitcoinjs-lib network to network type.
 */
export function toNetworkType(network: bitcoin.Network): NetworkType {
  if (network.bech32 == bitcoin.networks.bitcoin.bech32) {
    return NetworkType.MAINNET;
  } else if (network.bech32 == bitcoin.networks.testnet.bech32) {
    return NetworkType.TESTNET;
  } else {
    return NetworkType.REGTEST;
  }
}
