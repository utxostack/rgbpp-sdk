import ECPairFactory from 'ecpair';
import bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';

bitcoin.initEccLib(ecc);
export const ECPair = ECPairFactory(ecc);

export const MIN_COLLECTABLE_SATOSHI = 546;
