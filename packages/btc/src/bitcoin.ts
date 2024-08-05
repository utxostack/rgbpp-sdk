import ecc from '@bitcoinerlab/secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import { isTaprootInput } from 'bitcoinjs-lib/src/psbt/bip371.js';
import { isP2TR, isP2WPKH, isP2PKH } from 'bitcoinjs-lib/src/psbt/psbtutils.js';

bitcoin.initEccLib(ecc);

const ECPair = ECPairFactory(ecc);

export type { ECPairInterface };
export { ecc, ECPair, bitcoin, isP2TR, isP2PKH, isP2WPKH, isTaprootInput };
