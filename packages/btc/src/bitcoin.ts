import * as bitcoin from 'bitcoinjs-lib';
import ecc from '@bitcoinerlab/secp256k1';
import ECPairFactory from 'ecpair';
import BIP32Factory from 'bip32';

bitcoin.initEccLib(ecc);

const ECPair = ECPairFactory(ecc);
const Bip32 = BIP32Factory(ecc);

export default bitcoin;
export { bitcoin, ECPair, Bip32 };
