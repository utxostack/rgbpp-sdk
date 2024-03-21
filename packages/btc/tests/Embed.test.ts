import { describe, it, expect } from 'vitest';
import { dataToOpReturnScriptPubkey, opReturnScriptPubKeyToData } from '../src';

describe('Embed', () => {
  it('Encode UTF-8 data to OP_RETURN script pubkey', () => {
    const data = Buffer.from('test-commitment', 'utf-8');
    const script = dataToOpReturnScriptPubkey(data);

    expect(script.toString('hex')).toEqual('6a0f746573742d636f6d6d69746d656e74');
  });
  it('Decode UTF-8 data from OP_RETURN script pubkey', () => {
    const script = Buffer.from('6a0f746573742d636f6d6d69746d656e74', 'hex');
    const data = opReturnScriptPubKeyToData(script);

    expect(data.toString('utf-8')).toEqual('test-commitment');
  });

  it('Decode 32-byte hex from OP_RETURN script pubkey', () => {
    const hex = '00'.repeat(32);
    const script = Buffer.from('6a20' + hex, 'hex');
    const data = opReturnScriptPubKeyToData(script);

    expect(data.toString('hex')).toEqual(hex);
  });

  it('Encode 80-byte data to OP_RETURN script pubkey', () => {
    const hex = '00'.repeat(80);
    const data = Buffer.from(hex, 'hex');
    const script = dataToOpReturnScriptPubkey(data);

    expect(script.toString('hex')).toEqual('6a4c50' + hex);
  });
  it('Decode 80-byte hex from OP_RETURN script pubkey', () => {
    const hex = '00'.repeat(80);
    const script = Buffer.from('6a4c50' + hex, 'hex');
    const data = opReturnScriptPubKeyToData(script);

    expect(data.toString('hex')).toEqual(hex);
  });
});
