import { bitcoin } from './bitcoin';
import { AddressType } from './types';
import { NetworkType, toPsbtNetwork } from './network';
import { ErrorCodes, TxBuildError } from './error';

/**
 * Convert public key to bitcoin payment object.
 */
export function publicKeyToPayment(publicKey: string, addressType: AddressType, networkType: NetworkType) {
  if (!publicKey) {
    return void 0;
  }

  const network = toPsbtNetwork(networkType);
  const pubkey = Buffer.from(publicKey, 'hex');

  if (addressType === AddressType.P2PKH) {
    return bitcoin.payments.p2pkh({
      pubkey,
      network,
    });
  }
  if (addressType === AddressType.P2WPKH || addressType === AddressType.M44_P2WPKH) {
    return bitcoin.payments.p2wpkh({
      pubkey,
      network,
    });
  }
  if (addressType === AddressType.P2TR || addressType === AddressType.M44_P2TR) {
    return bitcoin.payments.p2tr({
      internalPubkey: pubkey.slice(1, 33),
      network,
    });
  }
  if (addressType === AddressType.P2SH_P2WPKH) {
    const data = bitcoin.payments.p2wpkh({
      pubkey,
      network,
    });
    return bitcoin.payments.p2sh({
      pubkey,
      network,
      redeem: data,
    });
  }

  return void 0;
}

/**
 * Convert public key to bitcoin address.
 */
export function publicKeyToAddress(publicKey: string, addressType: AddressType, networkType: NetworkType) {
  const payment = publicKeyToPayment(publicKey, addressType, networkType);
  if (payment && payment.address) {
    return payment.address;
  } else {
    throw new TxBuildError(ErrorCodes.UNSUPPORTED_ADDRESS_TYPE);
  }
}

/**
 * Convert bitcoin address to scriptPk.
 */
export function addressToScriptPublicKey(address: string, networkType: NetworkType): Buffer {
  const network = toPsbtNetwork(networkType);
  return bitcoin.address.toOutputScript(address, network);
}

/**
 * Convert bitcoin address to scriptPk in hex.
 */
export function addressToScriptPublicKeyHex(address: string, networkType: NetworkType): string {
  const scriptPk = addressToScriptPublicKey(address, networkType);
  return scriptPk.toString('hex');
}

/**
 * Check if the address is valid.
 */
export function isValidAddress(address: string, networkType: NetworkType) {
  try {
    bitcoin.address.toOutputScript(address, toPsbtNetwork(networkType));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get AddressType of an address.
 */
export function getAddressType(address: string): AddressType {
  return decodeAddress(address).addressType;
}

export function decodeAddress(address: string): {
  networkType: NetworkType;
  addressType: AddressType;
  dust: number;
} {
  const mainnet = bitcoin.networks.bitcoin;
  const testnet = bitcoin.networks.testnet;
  const regtest = bitcoin.networks.regtest;
  let decodeBase58: bitcoin.address.Base58CheckResult;
  let decodeBech32: bitcoin.address.Bech32Result;
  let networkType: NetworkType | undefined;
  let addressType: AddressType | undefined;
  if (address.startsWith('bc1') || address.startsWith('tb1') || address.startsWith('bcrt1')) {
    try {
      decodeBech32 = bitcoin.address.fromBech32(address);
      if (decodeBech32.prefix === mainnet.bech32) {
        networkType = NetworkType.MAINNET;
      } else if (decodeBech32.prefix === testnet.bech32) {
        networkType = NetworkType.TESTNET;
      } else if (decodeBech32.prefix === regtest.bech32) {
        networkType = NetworkType.REGTEST;
      }
      if (decodeBech32.version === 0) {
        if (decodeBech32.data.length === 20) {
          addressType = AddressType.P2WPKH;
        } else if (decodeBech32.data.length === 32) {
          addressType = AddressType.P2WSH;
        }
      } else if (decodeBech32.version === 1) {
        if (decodeBech32.data.length === 32) {
          addressType = AddressType.P2TR;
        }
      }
      if (networkType && addressType) {
        return {
          networkType,
          addressType,
          dust: getAddressTypeDust(addressType),
        };
      }
    } catch (e) {}
  } else {
    try {
      decodeBase58 = bitcoin.address.fromBase58Check(address);
      if (decodeBase58.version === mainnet.pubKeyHash) {
        networkType = NetworkType.MAINNET;
        addressType = AddressType.P2PKH;
      } else if (decodeBase58.version === testnet.pubKeyHash) {
        networkType = NetworkType.TESTNET;
        addressType = AddressType.P2PKH;
      } else if (decodeBase58.version === regtest.pubKeyHash) {
        // do not work
        networkType = NetworkType.REGTEST;
        addressType = AddressType.P2PKH;
      } else if (decodeBase58.version === mainnet.scriptHash) {
        networkType = NetworkType.MAINNET;
        addressType = AddressType.P2SH_P2WPKH;
      } else if (decodeBase58.version === testnet.scriptHash) {
        networkType = NetworkType.TESTNET;
        addressType = AddressType.P2SH_P2WPKH;
      } else if (decodeBase58.version === regtest.scriptHash) {
        // do not work
        networkType = NetworkType.REGTEST;
        addressType = AddressType.P2SH_P2WPKH;
      }

      if (networkType && addressType) {
        return {
          networkType,
          addressType,
          dust: getAddressTypeDust(addressType),
        };
      }
    } catch (e) {}
  }

  return {
    addressType: AddressType.UNKNOWN,
    networkType: NetworkType.MAINNET,
    dust: 546,
  };
}

function getAddressTypeDust(addressType: AddressType) {
  if (addressType === AddressType.P2WPKH || addressType === AddressType.M44_P2WPKH) {
    return 294;
  } else if (addressType === AddressType.P2TR || addressType === AddressType.M44_P2TR) {
    return 330;
  } else {
    return 546;
  }
}
