import { describe, it, expect } from 'vitest';
import { Collector } from '.';

describe('collector', () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });

  it('getLiveCell', async () => {
    const cell = await collector.getLiveCell({
      txHash: '0xfa87db3187be8cf850117ccfcdfe2525c44f1a58f71d9714dd2ce489e9723182',
      index: '0x0',
    });
    expect(cell.output.lock.args).toBe('0x0450340178ae277261a838c89f9ccb76a190ed4b');
  });

  it('getLiveCells', async () => {
    const [cell1, cell2, cell3] = await collector.getLiveCells([
      //  Cellbase
      { txHash: '0xfa87db3187be8cf850117ccfcdfe2525c44f1a58f71d9714dd2ce489e9723182', index: '0x0' },
      { txHash: '0xed5adcba9bbbfe76c546264f2b8a33cbf9c95d09a88550bb0a4f98d6f36a6ed2', index: '0x0' },
      // Nervos DAO
      { txHash: '0x8277d74d33850581f8d843613ded0c2a1722dec0e87e748f45c115dfb14210f1', index: '0x0' },
    ]);
    expect(cell1.output.lock.args).toBe('0x0450340178ae277261a838c89f9ccb76a190ed4b');
    expect(cell2.output.lock.args).toBe('0xf1cbacc833b5c62f79ac8de6aa7ffbe464cae563');
    expect(cell3.output.type?.codeHash).toBe('0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e');
  });
});
