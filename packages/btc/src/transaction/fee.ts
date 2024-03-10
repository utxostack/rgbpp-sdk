import { bitcoin, ECPair } from '../bitcoin';
import { ECPairInterface } from 'ecpair';
import { AddressType } from '../types';
import { publicKeyToAddress } from '../address';
import { NetworkType, toPsbtNetwork } from '../network';
import { toXOnly } from '../utils';

export class FeeEstimator {
  public networkType: NetworkType;
  public addressType: AddressType;
  public network: bitcoin.Network;

  private readonly keyPair: ECPairInterface;
  public publicKey: string;
  public address: string;

  constructor(wif: string, networkType: NetworkType, addressType: AddressType) {
    const network = toPsbtNetwork(networkType);
    const keyPair = ECPair.fromWIF(wif, network);

    this.keyPair = keyPair;
    this.publicKey = keyPair.publicKey.toString('hex');
    this.address = publicKeyToAddress(this.publicKey, addressType, networkType);

    this.addressType = addressType;
    this.networkType = networkType;
    this.network = network;
  }

  static fromRandom(addressType: AddressType, networkType: NetworkType) {
    const network = toPsbtNetwork(networkType);
    const keyPair = ECPair.makeRandom({ network });
    return new FeeEstimator(keyPair.toWIF(), networkType, addressType);
  }

  async signPsbt(psbt: bitcoin.Psbt): Promise<bitcoin.Psbt> {
    psbt.data.inputs.forEach((v, index) => {
      const isNotSigned = !(v.finalScriptSig || v.finalScriptWitness);
      const isP2TR = this.addressType === AddressType.P2TR || this.addressType === AddressType.M44_P2TR;
      const lostInternalPubkey = !v.tapInternalKey;
      // Special measures taken for compatibility with certain applications.
      if (isNotSigned && isP2TR && lostInternalPubkey) {
        const tapInternalKey = toXOnly(Buffer.from(this.publicKey, 'hex'));
        const { output } = bitcoin.payments.p2tr({
          internalPubkey: tapInternalKey,
          network: toPsbtNetwork(this.networkType),
        });
        if (v.witnessUtxo?.script.toString('hex') == output?.toString('hex')) {
          v.tapInternalKey = tapInternalKey;
        }
      }
    });

    // TODO: support multiple from addresses
    psbt.signAllInputs(this.keyPair);

    psbt.finalizeAllInputs();
    return psbt;
  }
}
