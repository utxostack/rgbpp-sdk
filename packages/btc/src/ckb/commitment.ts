import { sha256 } from 'js-sha256';
import { Input, Output } from '@ckb-lumos/lumos';
import { blockchain, bytes } from '@ckb-lumos/lumos/codec';
import { utf8ToBuffer } from '../utils';
import { RgbppLockArgs, unpackRgbppLockArgs } from './molecule';
import { BTC_TX_ID_PLACEHOLDER } from '../constants';

interface CommitmentCkbRawTx {
  inputs: Input[];
  outputs: Output[];
  outputsData: string[];
}

/**
 * Calculate RGBPP transaction commitment for validation.
 */
export function calculateCommitment(tx: CommitmentCkbRawTx): string {
  const hash = sha256.create();

  // Prefix
  hash.update(utf8ToBuffer('RGB++'));

  // Version
  // TODO: Support versioning when needed
  const version = [0, 0];
  hash.update(version);

  // Length of inputs & outputs
  hash.update([tx.inputs.length, tx.outputs.length]);

  // Inputs
  for (const input of tx.inputs) {
    hash.update(blockchain.OutPoint.pack(input.previousOutput));
  }

  // Outputs
  for (let index = 0; index < tx.outputs.length; index++) {
    const output = tx.outputs[index];
    const lockArgs = unpackRgbppLockArgs(output.lock.args);
    hash.update(
      blockchain.CellOutput.pack({
        capacity: output.capacity,
        type: output.type,
        lock: {
          ...output.lock,
          args: RgbppLockArgs.pack({
            outIndex: lockArgs.outIndex,
            btcTxId: BTC_TX_ID_PLACEHOLDER, // 32-byte placeholder
          }),
        },
      }),
    );

    const outputData = tx.outputsData[index] ?? '0x';
    hash.update(bytes.bytify(outputData));
  }

  // Double sha256
  return sha256(hash.array());
}
