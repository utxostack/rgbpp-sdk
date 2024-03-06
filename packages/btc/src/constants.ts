import ecc from '@bitcoinerlab/secp256k1';
import ECPairFactory from 'ecpair';
import bitcoin from './bitcoin';

bitcoin.initEccLib(ecc);
export const ECPair = ECPairFactory(ecc);

export const MIN_COLLECTABLE_SATOSHI = 546;
