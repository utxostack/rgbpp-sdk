import { describe, it, expect } from 'vitest';
import { Collector } from '.';

describe('collector', () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });

  it('getLiveCell', async () => {
    const cell = await collector.getLiveCell({
      txHash: '0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f',
      index: '0x0',
    });
    expect(cell.output.lock.codeHash).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
  });

  it('getLiveCells', async () => {
    const [cell1, cell2] = await collector.getLiveCells([
      //  Genesis block
      { txHash: '0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f', index: '0x0' },
      // Nervos DAO
      { txHash: '0x8277d74d33850581f8d843613ded0c2a1722dec0e87e748f45c115dfb14210f1', index: '0x0' },
    ]);
    expect(cell1.output.lock.codeHash).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    expect(cell2.output.type?.codeHash).toBe('0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e');
  });
});
