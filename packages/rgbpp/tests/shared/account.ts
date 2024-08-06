import {
  NetworkType,
  ECPair,
  bitcoin,
  remove0x,
  tweakSigner,
  isP2trScript,
  isP2wpkhScript,
  networkTypeToNetwork,
} from '@rgbpp-sdk/btc';

export interface BtcAccount {
  address: string;
  scriptPubkey: string;
  keyPair: bitcoin.Signer;
  payment: bitcoin.Payment;
}

export function createP2wpkhAccount(privateKey: string, networkType: NetworkType): BtcAccount {
  const privateKeyBuffer = Buffer.from(remove0x(privateKey), 'hex');
  const keyPair = ECPair.fromPrivateKey(privateKeyBuffer);
  const payment = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network: networkTypeToNetwork(networkType),
  });

  return {
    keyPair,
    payment,
    address: payment.address!,
    scriptPubkey: payment.output!.toString('hex'),
  };
}

export function signPsbt(psbt: bitcoin.Psbt, account: BtcAccount): bitcoin.Psbt {
  // Create a tweaked signer for P2TR
  const tweakedSigner = tweakSigner(account.keyPair, {
    network: account.payment.network,
  });

  // Sign each input
  psbt.data.inputs.forEach((input, index) => {
    if (input.witnessUtxo) {
      const script = input.witnessUtxo.script.toString('hex');
      if (isP2wpkhScript(script) && script === account.scriptPubkey) {
        psbt.signInput(index, account.keyPair);
      }
      if (isP2trScript(script) && script === account.scriptPubkey) {
        psbt.signInput(index, tweakedSigner);
      }
    }
  });

  return psbt;
}

export function signAndFinalizePsbt(psbt: bitcoin.Psbt, accounts: BtcAccount[]): bitcoin.Psbt {
  for (const account of accounts) {
    signPsbt(psbt, account);
  }

  return psbt.finalizeAllInputs();
}
