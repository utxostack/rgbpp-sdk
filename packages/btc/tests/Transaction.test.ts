import { describe, expect, it } from 'vitest';
import { accounts, config, network, service, source } from './shared/env';
import { expectPsbtFeeInRange, signAndBroadcastPsbt, waitFor } from './shared/utils';
import { bitcoin, ErrorMessages, ErrorCodes, AddressType } from '../src';
import { createSendUtxosBuilder, createSendBtcBuilder, sendBtc, sendUtxos, sendRbf, tweakSigner } from '../src';

const STATIC_FEE_RATE = 1;
const BTC_UTXO_DUST_LIMIT = config.btcUtxoDustLimit;
const RGBPP_UTXO_DUST_LIMIT = config.rgbppUtxoDustLimit;

describe('Transaction', () => {
  describe('sendBtc()', () => {
    it('Transfer from Native SegWit (P2WPKH) address', async () => {
      const { builder, feeRate } = await createSendBtcBuilder({
        from: accounts.charlie.p2wpkh.address,
        tos: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      const psbt = builder.toPsbt();
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(feeRate).toEqual(STATIC_FEE_RATE);
      expectPsbtFeeInRange(psbt, feeRate);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer from Taproot (P2TR) address', async () => {
      const psbt = await sendBtc({
        from: accounts.charlie.p2tr.address,
        fromPubkey: accounts.charlie.publicKey,
        tos: [
          {
            address: accounts.charlie.p2tr.address,
            value: 1000,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Create a tweaked signer
      const tweakedSigner = tweakSigner(accounts.charlie.keyPair, {
        network,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(tweakedSigner);
      psbt.finalizeAllInputs();

      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer with defined value < minUtxoSatoshi', async () => {
      await expect(() =>
        sendBtc({
          from: accounts.charlie.p2wpkh.address,
          tos: [
            {
              address: accounts.charlie.p2wpkh.address,
              value: 546,
            },
          ],
          feeRate: STATIC_FEE_RATE,
          source,
        }),
      ).rejects.toThrow();
    });
    it('Transfer with an impossible "minUtxoSatoshi" filter', async () => {
      const balance = await service.getBtcBalance(accounts.charlie.p2wpkh.address, {
        min_satoshi: BTC_UTXO_DUST_LIMIT,
      });

      const impossibleLimit = balance.satoshi + balance.pending_satoshi + 1;

      await expect(() =>
        sendBtc({
          from: accounts.charlie.p2wpkh.address,
          tos: [
            {
              address: accounts.charlie.p2wpkh.address,
              value: impossibleLimit,
            },
          ],
          minUtxoSatoshi: impossibleLimit,
          feeRate: STATIC_FEE_RATE,
          source,
        }),
      ).rejects.toThrow(ErrorMessages[ErrorCodes.INSUFFICIENT_UTXO]);
    });
    it('Transfer with an extra OP_RETURN output', async () => {
      const psbt = await sendBtc({
        from: accounts.charlie.p2wpkh.address,
        tos: [
          {
            data: Buffer.from('00'.repeat(32), 'hex'),
            value: 0,
          },
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      const outputs = psbt.txOutputs;
      expect(outputs).toHaveLength(3);

      const opReturnOutput = outputs[0];
      expect(opReturnOutput).toBeDefined();
      expect(opReturnOutput.script).toBeDefined();

      const scripts = bitcoin.script.decompile(opReturnOutput.script);
      expect(scripts).toBeDefined();

      const op = scripts![0];
      expect(op).toBeTypeOf('number');
      expect(op).toBe(bitcoin.opcodes.OP_RETURN);

      const data = scripts![1];
      expect(data).toBeInstanceOf(Buffer);
      expect((data as Buffer).toString('hex')).toEqual('00'.repeat(32));

      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
  });

  describe('sendUtxos()', () => {
    it('Transfer fixed UTXO, sum(ins) = sum(outs)', async () => {
      const { builder, feeRate, changeIndex } = await createSendUtxosBuilder({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 1000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
            fixed: true,
          },
        ],
        source,
        feeRate: STATIC_FEE_RATE,
      });

      // Sign & finalize inputs
      const psbt = builder.toPsbt();
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs.length).toBeGreaterThanOrEqual(2);
      expect(psbt.txOutputs).toHaveLength(2);
      expect(changeIndex).toEqual(1);
      expect(feeRate).toEqual(STATIC_FEE_RATE);
      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer fixed UTXO, sum(ins) = sum(outs) = 0', async () => {
      const { builder, feeRate } = await createSendUtxosBuilder({
        from: accounts.charlie.p2wpkh.address,
        inputs: [],
        outputs: [
          {
            data: Buffer.from('00'.repeat(32), 'hex'),
            fixed: true,
            value: 0,
          },
        ],
        source,
      });

      // Sign & finalize inputs
      const psbt = builder.toPsbt();
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs.length).toBeGreaterThanOrEqual(1);
      expect(psbt.txOutputs).toHaveLength(2);
      expectPsbtFeeInRange(psbt, feeRate);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer fixed UTXO, sum(ins) < sum(outs)', async () => {
      const psbt = await sendUtxos({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 1000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 2000,
            fixed: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs.length).toBeGreaterThanOrEqual(2);
      expect(psbt.txOutputs).toHaveLength(2);
      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer fixed UTXO, sum(ins) > sum(outs), change > fee, change < fee + minUtxoSatoshi', async () => {
      const psbt = await sendUtxos({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 2000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1500,
            fixed: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs.length).toBeGreaterThanOrEqual(2);
      expect(psbt.txOutputs).toHaveLength(2);
      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer fixed UTXO, sum(ins) > sum(outs), change > fee + minUtxoSatoshi', async () => {
      const psbt = await sendUtxos({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 2500,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
            fixed: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs).toHaveLength(1);
      expect(psbt.txOutputs).toHaveLength(2);
      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer fixed UTXO, sum(ins) > sum(outs), change = fee + minUtxoSatoshi', async () => {
      const psbt = await sendUtxos({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 3000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1856,
            fixed: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs).toHaveLength(1);
      expect(psbt.txOutputs).toHaveLength(2);
      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer fixed UTXO, sum(ins) > sum(outs), change < fee', async () => {
      const { builder, feeRate, changeIndex } = await createSendUtxosBuilder({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 2000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
            fixed: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      const psbt = builder.toPsbt();
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs.length).toBeGreaterThanOrEqual(2);
      expect(psbt.txOutputs).toHaveLength(2);
      expect(changeIndex).toEqual(1);
      expect(feeRate).toEqual(STATIC_FEE_RATE);
      expectPsbtFeeInRange(psbt, feeRate);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer fixed UTXO, sum(ins) > sum(outs), change = fee', async () => {
      const { builder, feeRate, changeIndex } = await createSendUtxosBuilder({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 3000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1859,
            fixed: true,
          },
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      const psbt = builder.toPsbt();
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs).toHaveLength(1);
      expect(psbt.txOutputs).toHaveLength(2);
      expect(changeIndex).toEqual(-1);
      expect(feeRate).toEqual(STATIC_FEE_RATE);
      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });

    it('Transfer protected UTXO, sum(ins) = sum(outs)', async () => {
      const psbt = await sendUtxos({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 2000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 2,
            value: 2000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 2000,
            protected: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs).toHaveLength(2);
      expect(psbt.txOutputs).toHaveLength(1);
      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer protected UTXO, sum(ins) < sum(outs)', async () => {
      const psbt = await sendUtxos({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 1000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 2000,
            protected: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs.length).toBeGreaterThanOrEqual(2);
      expect(psbt.txOutputs).toHaveLength(1);
      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer protected UTXO, sum(ins) > sum(outs), change > fee', async () => {
      const psbt = await sendUtxos({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 2000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1500,
            protected: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs).toHaveLength(1);
      expect(psbt.txOutputs).toHaveLength(1);
      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer protected UTXO, sum(ins) > sum(outs), change < fee', async () => {
      const { builder, feeRate } = await createSendUtxosBuilder({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 2000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
            protected: true,
          },
        ],
        feeRate: 10,
        source,
      });

      // Sign & finalize inputs
      const psbt = builder.toPsbt();
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs.length).toBeGreaterThanOrEqual(2);
      expect(psbt.txOutputs).toHaveLength(1);
      expect(feeRate).toEqual(10);
      expectPsbtFeeInRange(psbt, feeRate);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });

    it('Transfer protected UTXO, change to the first address-matched output', async () => {
      const { builder, changeIndex } = await createSendUtxosBuilder({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 10000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2tr.address,
            value: 1000,
            protected: true,
          },
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
            protected: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      const psbt = builder.toPsbt();
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(changeIndex).toEqual(1);
      expect(psbt.txInputs).toHaveLength(1);
      expect(psbt.txOutputs).toHaveLength(2);
      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer mixed UTXO, change to the first non-fixed output', async () => {
      const { builder, changeIndex } = await createSendUtxosBuilder({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: 10000,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
            fixed: true,
          },
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
            protected: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      const psbt = builder.toPsbt();
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(changeIndex).toEqual(1);
      expect(psbt.txInputs).toHaveLength(1);
      expect(psbt.txOutputs).toHaveLength(2);
      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });

    it('Transfer protected RGBPP_UTXOs, sum(ins) = sum(outs)', async () => {
      const psbt = await sendUtxos({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: RGBPP_UTXO_DUST_LIMIT,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 2,
            value: RGBPP_UTXO_DUST_LIMIT,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            minUtxoSatoshi: RGBPP_UTXO_DUST_LIMIT,
            value: RGBPP_UTXO_DUST_LIMIT,
            protected: true,
          },
          {
            address: accounts.charlie.p2wpkh.address,
            minUtxoSatoshi: RGBPP_UTXO_DUST_LIMIT,
            value: RGBPP_UTXO_DUST_LIMIT,
            protected: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs.length).toBeGreaterThanOrEqual(3);
      expect(psbt.txOutputs).toHaveLength(2);
      expect(psbt.txOutputs[0].value).toBeGreaterThan(RGBPP_UTXO_DUST_LIMIT);
      expect(psbt.txOutputs[1].value).toBe(RGBPP_UTXO_DUST_LIMIT);

      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer protected RGBPP_UTXOs, each has free satoshi', async () => {
      const psbt = await sendUtxos({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: (RGBPP_UTXO_DUST_LIMIT + 100) * 3,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            minUtxoSatoshi: RGBPP_UTXO_DUST_LIMIT,
            value: RGBPP_UTXO_DUST_LIMIT + 100,
            protected: true,
          },
          {
            address: accounts.charlie.p2wpkh.address,
            minUtxoSatoshi: RGBPP_UTXO_DUST_LIMIT,
            value: RGBPP_UTXO_DUST_LIMIT + 100,
            protected: true,
          },
          {
            address: accounts.charlie.p2wpkh.address,
            minUtxoSatoshi: RGBPP_UTXO_DUST_LIMIT,
            value: RGBPP_UTXO_DUST_LIMIT + 100,
            protected: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs).toHaveLength(1);
      expect(psbt.txOutputs).toHaveLength(3);
      expect(psbt.txOutputs[0].value).toBeLessThan(psbt.txOutputs[1].value);
      expect(psbt.txOutputs[1].value).toBeLessThan(psbt.txOutputs[2].value);

      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });
    it('Transfer protected RGBPP_UTXOs, with insufficient free satoshi', async () => {
      const psbt = await sendUtxos({
        from: accounts.charlie.p2wpkh.address,
        inputs: [
          {
            txid: '4e1e9f8ff4bf245793c05bf2da58bff812c332a296d93c6935fbc980d906e567',
            vout: 1,
            value: RGBPP_UTXO_DUST_LIMIT * 2 + 100,
            addressType: AddressType.P2WPKH,
            address: accounts.charlie.p2wpkh.address,
            scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
          },
        ],
        outputs: [
          {
            address: accounts.charlie.p2wpkh.address,
            minUtxoSatoshi: RGBPP_UTXO_DUST_LIMIT,
            value: RGBPP_UTXO_DUST_LIMIT + 100,
            protected: true,
          },
          {
            address: accounts.charlie.p2wpkh.address,
            minUtxoSatoshi: RGBPP_UTXO_DUST_LIMIT,
            value: RGBPP_UTXO_DUST_LIMIT,
            protected: true,
          },
        ],
        feeRate: STATIC_FEE_RATE,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      expect(psbt.txInputs.length).toBeGreaterThanOrEqual(2);
      expect(psbt.txOutputs).toHaveLength(2);
      expect(psbt.txOutputs[0].value).toBeGreaterThan(RGBPP_UTXO_DUST_LIMIT);
      expect(psbt.txOutputs[1].value).toBe(RGBPP_UTXO_DUST_LIMIT);

      expectPsbtFeeInRange(psbt, STATIC_FEE_RATE);

      // Broadcast transaction
      // const tx = psbt.extractTransaction();
      // const res = await service.sendBtcTransaction(tx.toHex());
      // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    });

    it('Try transfer non-existence UTXO', async () => {
      await expect(() =>
        sendUtxos({
          from: accounts.charlie.p2wpkh.address,
          inputs: [
            {
              txid: '00'.repeat(32),
              vout: 0,
              value: 1000,
              addressType: AddressType.P2WPKH,
              address: accounts.charlie.p2wpkh.address,
              scriptPk: accounts.charlie.p2wpkh.scriptPubkey.toString('hex'),
            },
          ],
          outputs: [
            {
              address: accounts.charlie.p2wpkh.address,
              value: 1000,
            },
          ],
          onlyConfirmedUtxos: true,
          feeRate: STATIC_FEE_RATE,
          source,
        }),
      ).rejects.toThrow();
    });
  });

  describe.skip('sendRbf()', () => {
    it('Full RBF', async () => {
      /**
       * TX_1, feeRate=minimumFee/2
       */
      const feeRates = await service.getBtcRecommendedFeeRates();
      const expectFeeRate = Math.max(Math.round(feeRates.minimumFee / 2), 1);
      const psbt = await sendBtc({
        from: accounts.charlie.p2wpkh.address,
        tos: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: BTC_UTXO_DUST_LIMIT,
          },
        ],
        feeRate: expectFeeRate,
        source,
      });
      const { txHex } = await signAndBroadcastPsbt({
        psbt,
        account: accounts.charlie,
        feeRate: expectFeeRate,
      });

      /**
       * Wait for 2 seconds
       */
      await waitFor(2000);
      console.log('---');

      /**
       * TX_2, feeRate=fastestFee
       */
      const expectFeeRate2 = Math.max(feeRates.fastestFee, expectFeeRate + 1);
      const psbt2 = await sendRbf({
        txHex: txHex,
        from: accounts.charlie.p2wpkh.address,
        feeRate: expectFeeRate2,
        source,
      });
      await signAndBroadcastPsbt({
        psbt: psbt2,
        account: accounts.charlie,
        feeRate: expectFeeRate2,
      });
    }, 0);
    it('Full RBF with changeIndex', async () => {
      /**
       * TX_1, feeRate=1
       */
      const feeRates = await service.getBtcRecommendedFeeRates();
      const expectFeeRate = Math.max(Math.round(feeRates.minimumFee / 2), 1);
      const psbt = await sendBtc({
        from: accounts.charlie.p2wpkh.address,
        tos: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: BTC_UTXO_DUST_LIMIT,
          },
        ],
        feeRate: expectFeeRate,
        source,
      });
      const { tx, txHex } = await signAndBroadcastPsbt({
        psbt,
        account: accounts.charlie,
        feeRate: expectFeeRate,
      });

      /**
       * Wait for 2 seconds
       */
      await waitFor(2000);
      console.log('---');

      /**
       * TX_2, feeRate=fastestFee
       */
      const expectFeeRate2 = Math.max(feeRates.fastestFee, expectFeeRate + 1);
      const changeIndex = tx.outs.length - 1;
      const psbt2 = await sendRbf({
        txHex: txHex,
        from: accounts.charlie.p2wpkh.address,
        feeRate: expectFeeRate2,
        changeIndex,
        source,
      });
      await signAndBroadcastPsbt({
        psbt: psbt2,
        account: accounts.charlie,
        feeRate: expectFeeRate2,
      });
    }, 0);
    it('Full RBF with changeIndex, outputs.length == 1', async () => {
      /**
       * TX_1, feeRate=1
       */
      const feeRates = await service.getBtcRecommendedFeeRates();
      const expectFeeRate = Math.max(Math.round(feeRates.minimumFee / 2), 1);
      const psbt = await sendBtc({
        from: accounts.charlie.p2wpkh.address,
        tos: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: BTC_UTXO_DUST_LIMIT,
            protected: true,
            fixed: false,
          },
        ],
        feeRate: expectFeeRate,
        source,
      });
      const { tx, txHex } = await signAndBroadcastPsbt({
        psbt,
        account: accounts.charlie,
        feeRate: expectFeeRate,
      });

      console.log(tx.outs);

      /**
       * Wait for 2 seconds
       */
      await waitFor(2000);
      console.log('---');

      /**
       * TX_2, feeRate=fastestFee
       */
      const expectFeeRate2 = Math.max(feeRates.fastestFee, expectFeeRate + 1);
      const changeIndex = tx.outs.length - 1;
      const psbt2 = await sendRbf({
        txHex: txHex,
        from: accounts.charlie.p2wpkh.address,
        feeRate: expectFeeRate2,
        changeIndex,
        source,
      });
      await signAndBroadcastPsbt({
        psbt: psbt2,
        account: accounts.charlie,
        feeRate: expectFeeRate2,
      });
    }, 0);
    it('Full RBF with changeIndex, outputs.length != changeIndex + 1', async () => {
      /**
       * TX_1, feeRate=1
       */
      const feeRates = await service.getBtcRecommendedFeeRates();
      const expectFeeRate = Math.max(Math.round(feeRates.minimumFee / 2), 1);
      const psbt = await sendBtc({
        from: accounts.charlie.p2wpkh.address,
        tos: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 3000,
          },
        ],
        feeRate: expectFeeRate,
        source,
      });
      const { txHex } = await signAndBroadcastPsbt({
        psbt,
        account: accounts.charlie,
        feeRate: expectFeeRate,
      });

      /**
       * Wait for 2 seconds
       */
      await waitFor(2000);
      console.log('---');

      /**
       * TX_2, feeRate=fastestFee
       */
      const expectFeeRate2 = Math.max(feeRates.fastestFee, expectFeeRate + 1);
      const psbt2 = await sendRbf({
        txHex: txHex,
        from: accounts.charlie.p2wpkh.address,
        feeRate: expectFeeRate2,
        changeIndex: 0,
        source,
      });
      await signAndBroadcastPsbt({
        psbt: psbt2,
        account: accounts.charlie,
        feeRate: expectFeeRate2,
      });
    }, 0);
    it('Try Full RBF with invalid change', async () => {
      /**
       * TX_1, feeRate=1
       */
      const expectFeeRate = 1;
      const psbt = await sendBtc({
        from: accounts.charlie.p2wpkh.address,
        tos: [
          {
            data: Buffer.from('hello'),
            value: 0,
          },
          {
            address: accounts.charlie.p2tr.address,
            value: BTC_UTXO_DUST_LIMIT,
          },
        ],
        feeRate: expectFeeRate,
        source,
      });
      const { tx, txHex } = await signAndBroadcastPsbt({
        psbt,
        account: accounts.charlie,
        feeRate: expectFeeRate,
      });

      /**
       * Wait for 2 seconds
       */
      console.log('---');
      await waitFor(2000);
      const expectFeeRate2 = expectFeeRate * 2;

      /**
       * TX_2, outputs[changeIndex] == undefined
       */
      await expect(() =>
        sendRbf({
          txHex: txHex,
          from: accounts.charlie.p2wpkh.address,
          changeAddress: accounts.charlie.p2tr.address,
          feeRate: expectFeeRate2,
          changeIndex: 3,
          source,
        }),
      ).rejects.toHaveProperty('code', ErrorCodes.INVALID_CHANGE_OUTPUT);
      /**
       * TX_3, changeOutput is not returnable
       */
      await expect(() =>
        sendRbf({
          txHex: txHex,
          from: accounts.charlie.p2wpkh.address,
          feeRate: expectFeeRate2,
          changeIndex: 0,
          source,
        }),
      ).rejects.toHaveProperty('code', ErrorCodes.INVALID_CHANGE_OUTPUT);
      /**
       * TX_4, changeAddress !== changeOutputAddress
       */
      await expect(() =>
        sendRbf({
          txHex: txHex,
          from: accounts.charlie.p2wpkh.address,
          changeAddress: accounts.charlie.p2tr.address,
          changeIndex: tx.outs.length - 1,
          feeRate: expectFeeRate2,
          source,
        }),
      ).rejects.toHaveProperty('code', ErrorCodes.INVALID_CHANGE_OUTPUT);
    }, 0);
    it('Try Full RBF with invalid feeRate', async () => {
      /**
       * TX_1, feeRate=1
       */
      const expectFeeRate = 1;
      const psbt = await sendBtc({
        from: accounts.charlie.p2wpkh.address,
        tos: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: BTC_UTXO_DUST_LIMIT,
          },
        ],
        feeRate: expectFeeRate,
        source,
      });
      const { txHex } = await signAndBroadcastPsbt({
        psbt,
        account: accounts.charlie,
        feeRate: expectFeeRate,
      });

      /**
       * Wait for 2 seconds
       */
      await waitFor(2000);
      console.log('---');

      /**
       * TX_2, feeRate=1
       */
      await expect(
        await sendRbf({
          txHex: txHex,
          from: accounts.charlie.p2wpkh.address,
          feeRate: expectFeeRate,
          source,
        }),
      ).rejects.toHaveProperty('code', ErrorCodes.INVALID_FEE_RATE);
    }, 0);
  });

  describe.todo('sendRgbppUtxos()', () => {
    // TODO: fill tests
  });
});
