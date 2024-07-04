import { AddressType } from '../address';
import { NetworkType } from '../preset/types';
import { toXOnly, tweakSigner } from '../utils';
import { networkTypeToNetwork } from '../preset/network';
import { isP2trScript, isP2wpkhScript } from '../script';
import { ECPairInterface, bitcoin, ECPair, isTaprootInput } from '../bitcoin';
import { Utxo } from './utxo';

interface FeeEstimateAccount {
  payment: bitcoin.Payment;
  addressType: AddressType;
  address: string;
  scriptPubkey: string;
  tapInternalKey?: Buffer;
}

export class FeeEstimator {
  public networkType: NetworkType;
  public network: bitcoin.Network;

  private readonly keyPair: ECPairInterface;
  public readonly pubkey: string;
  public accounts: {
    p2wpkh: FeeEstimateAccount;
    p2tr: FeeEstimateAccount;
  };

  constructor(wif: string, networkType: NetworkType) {
    const network = networkTypeToNetwork(networkType);
    this.networkType = networkType;
    this.network = network;

    const keyPair = ECPair.fromWIF(wif, network);
    this.pubkey = keyPair.publicKey.toString('hex');
    this.keyPair = keyPair;

    const p2wpkh = bitcoin.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network,
    });
    const p2tr = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(keyPair.publicKey),
      network,
    });
    this.accounts = {
      p2wpkh: {
        payment: p2wpkh,
        address: p2wpkh.address!,
        addressType: AddressType.P2WPKH,
        scriptPubkey: p2wpkh.output!.toString('hex'),
      },
      p2tr: {
        payment: p2tr,
        address: p2tr.address!,
        addressType: AddressType.P2TR,
        tapInternalKey: toXOnly(keyPair.publicKey),
        scriptPubkey: p2tr.output!.toString('hex'),
      },
    };
  }

  static fromRandom(networkType: NetworkType) {
    const network = networkTypeToNetwork(networkType);
    const keyPair = ECPair.makeRandom({ network });
    return new FeeEstimator(keyPair.toWIF(), networkType);
  }

  replaceUtxo(utxo: Utxo): Utxo {
    if (utxo.addressType === AddressType.P2WPKH || isP2wpkhScript(utxo.scriptPk)) {
      utxo.scriptPk = this.accounts.p2wpkh.scriptPubkey;
      utxo.pubkey = this.pubkey;
    }
    if (utxo.addressType === AddressType.P2TR || isP2trScript(utxo.scriptPk)) {
      utxo.scriptPk = this.accounts.p2tr.scriptPubkey;
      utxo.pubkey = this.pubkey;
    }

    return utxo;
  }

  async signPsbt(psbt: bitcoin.Psbt): Promise<bitcoin.Psbt> {
    // Tweak signer for P2TR inputs
    const tweakedSigner = tweakSigner(this.keyPair, {
      network: this.network,
    });

    psbt.data.inputs.forEach((input, index) => {
      // Fill tapInternalKey for P2TR inputs if missing
      if (input.witnessUtxo) {
        const isNotSigned = !(input.finalScriptSig || input.finalScriptWitness);
        const isP2trInput = isP2trScript(input.witnessUtxo.script);
        const lostInternalPubkey = !input.tapInternalKey;
        if (isNotSigned && isP2trInput && lostInternalPubkey) {
          if (input.witnessUtxo.script.toString('hex') === this.accounts.p2tr.scriptPubkey) {
            input.tapInternalKey = this.accounts.p2tr.tapInternalKey!;
          }
        }
      }

      // Sign P2WPKH/P2TR inputs
      if (isTaprootInput(input)) {
        psbt.signInput(index, tweakedSigner);
      } else {
        psbt.signInput(index, this.keyPair);
      }
    });

    psbt.finalizeAllInputs();
    return psbt;
  }
}
