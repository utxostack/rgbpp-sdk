import {
  addressToScriptPublicKeyHex,
  networkTypeToNetwork,
  remove0x,
  toXOnly,
  transactionToHex,
  tweakSigner,
} from 'rgbpp/btc';
import { AddressType, NetworkType, bitcoin, ECPair } from 'rgbpp/btc';
import { BtcAssetsApi } from 'rgbpp/service';

export interface BtcAccount {
  from: string;
  fromPubkey?: string;
  keyPair: bitcoin.Signer;
  payment: bitcoin.Payment;
  addressType: AddressType;
  networkType: NetworkType;
}

export function createBtcAccount(privateKey: string, addressType: AddressType, networkType: NetworkType): BtcAccount {
  const network = networkTypeToNetwork(networkType);

  const key = Buffer.from(remove0x(privateKey), 'hex');
  const keyPair = ECPair.fromPrivateKey(key, { network });

  if (addressType === AddressType.P2WPKH) {
    const p2wpkh = bitcoin.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network,
    });
    return {
      from: p2wpkh.address!,
      payment: p2wpkh,
      keyPair,
      addressType,
      networkType,
    };
  } else if (addressType === AddressType.P2TR) {
    const p2tr = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(keyPair.publicKey),
      network,
    });
    return {
      from: p2tr.address!,
      fromPubkey: keyPair.publicKey.toString('hex'),
      payment: p2tr,
      keyPair,
      addressType,
      networkType,
    };
  } else {
    throw new Error('Unsupported address type, only support P2WPKH and P2TR');
  }
}

export function signPsbt(psbt: bitcoin.Psbt, account: BtcAccount): bitcoin.Psbt {
  const accountScript = addressToScriptPublicKeyHex(account.from, account.networkType);
  const tweakedSigner = tweakSigner(account.keyPair, {
    network: account.payment.network,
  });

  psbt.data.inputs.forEach((input, index) => {
    if (input.witnessUtxo) {
      const script = input.witnessUtxo.script.toString('hex');
      if (script === accountScript && account.addressType === AddressType.P2WPKH) {
        psbt.signInput(index, account.keyPair);
      }
      if (script === accountScript && account.addressType === AddressType.P2TR) {
        psbt.signInput(index, tweakedSigner);
      }
    }
  });

  return psbt;
}

export async function signAndSendPsbt(
  psbt: bitcoin.Psbt,
  account: BtcAccount,
  service: BtcAssetsApi,
): Promise<{
  txId: string;
  txHex: string;
  txHexRaw: string;
}> {
  signPsbt(psbt, account);
  psbt.finalizeAllInputs();

  const tx = psbt.extractTransaction();
  const txHex = tx.toHex();

  const { txid } = await service.sendBtcTransaction(txHex);

  return {
    txHex,
    txId: txid,
    txHexRaw: transactionToHex(tx, false),
  };
}
