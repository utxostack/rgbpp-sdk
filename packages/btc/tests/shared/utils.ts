import { expect } from 'vitest';
import { ECPairInterface } from 'ecpair';
import { NetworkType, bitcoin, ECPair } from '../../src';
import { toXOnly, remove0x, tweakSigner, isP2trScript, isP2wpkhScript } from '../../src';
import { config, network, networkType, service } from './env';

/**
 * Wait for a number of milliseconds.
 */
export function waitFor(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Estimate a network fee of a PSBT.
 */
export function calculatePsbtFee(psbt: bitcoin.Psbt, feeRate?: number) {
  if (!feeRate) {
    feeRate = config.feeRate;
  }

  const tx = psbt.extractTransaction(false);
  const virtualSize = tx.virtualSize();
  return Math.ceil(virtualSize * feeRate);
}

/**
 * Expect the paid fee of the PSBT to be in ±1 range of the estimated fee.
 */
export function expectPsbtFeeInRange(psbt: bitcoin.Psbt, feeRate?: number) {
  const estimated = calculatePsbtFee(psbt, feeRate);
  const paid = psbt.getFee();

  console.log('fee rate:', psbt.getFeeRate(), 'expected:', feeRate ?? config.feeRate);
  console.log('fee:', paid, 'expected:', estimated);

  const inputs = psbt.data.inputs.length;
  const diff = paid - estimated;

  expect(diff).toBeGreaterThanOrEqual(0);
  expect(diff).toBeLessThanOrEqual(diff + inputs);
}

/**
 * Report transaction info in log
 */
export function logTransaction(tx: bitcoin.Transaction, networkType: NetworkType) {
  const id = tx.getId();
  const hex = tx.toHex();
  const url = networkType === NetworkType.MAINNET ? 'https://mempool.space/tx' : 'https://mempool.space/testnet/tx';

  console.log('id:', id);
  console.log('hex:', hex);
  console.log('explorer:', `${url}/${id}`);
}

/**
 * Create accounts in tests for signing transactions
 */
export interface Account {
  keyPair: ECPairInterface;
  privateKey: Buffer;
  publicKey: string;
  p2wpkh: {
    scriptPubkey: Buffer;
    address: string;
    pubkey: Buffer;
    data: Buffer[];
  };
  p2tr: {
    scriptPubkey: Buffer;
    address: string;
    pubkey: Buffer;
    data: Buffer[];
  };
}
export function createAccount(props: { privateKey: string; network?: bitcoin.Network }): Account {
  const privateKey = Buffer.from(remove0x(props.privateKey), 'hex');
  const keyPair = ECPair.fromPrivateKey(privateKey, {
    network: props.network,
  });

  const p2wpkh = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network: props.network,
  });
  const p2tr = bitcoin.payments.p2tr({
    internalPubkey: toXOnly(keyPair.publicKey),
    network: props.network,
  });

  return {
    keyPair,
    privateKey,
    publicKey: keyPair.publicKey.toString('hex'),
    p2wpkh: {
      scriptPubkey: p2wpkh.output!,
      address: p2wpkh.address!,
      pubkey: p2wpkh.pubkey!,
      data: p2wpkh.data!,
    },
    p2tr: {
      scriptPubkey: p2tr.output!,
      address: p2tr.address!,
      pubkey: p2tr.pubkey!,
      data: p2tr.data!,
    },
  };
}

/**
 * Sign and broadcast a transaction to the service
 */
export async function signAndBroadcastPsbt(props: {
  psbt: bitcoin.Psbt;
  account: Account;
  feeRate?: number;
  send?: boolean;
}): Promise<{
  tx: bitcoin.Transaction;
  txId: string;
  txHex: string;
}> {
  const { psbt, account, feeRate, send = true } = props;

  // Create a tweaked signer for P2TR
  const tweakedSigner = tweakSigner(account.keyPair, { network });

  // Sign each input
  psbt.data.inputs.forEach((input, index) => {
    if (input.witnessUtxo) {
      const script = input.witnessUtxo.script.toString('hex');
      if (isP2wpkhScript(script) && script === account.p2wpkh.scriptPubkey.toString('hex')) {
        psbt.signInput(index, account.keyPair);
      }
      if (isP2trScript(script) && script === account.p2tr.scriptPubkey.toString('hex')) {
        psbt.signInput(index, tweakedSigner);
      }
    }
  });

  psbt.finalizeAllInputs();
  expectPsbtFeeInRange(psbt, feeRate);

  const tx = psbt.extractTransaction();
  logTransaction(tx, networkType);

  if (send) {
    const res = await service.sendBtcTransaction(tx.toHex());
    expect(res.txid).toEqual(tx.getId());
  }

  return {
    tx,
    txId: tx.getId(),
    txHex: tx.toHex(),
  };
}
