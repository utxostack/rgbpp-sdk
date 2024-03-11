import ECPairFactory from 'ecpair';
import ecc from '@bitcoinerlab/secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { isTaprootInput } from 'bitcoinjs-lib/src/psbt/bip371';

bitcoin.initEccLib(ecc);

const ECPair = ECPairFactory(ecc);

export { ecc, ECPair, bitcoin, isTaprootInput };
