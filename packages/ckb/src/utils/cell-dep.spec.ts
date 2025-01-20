import { describe, it, expect } from 'vitest';
import { CompatibleXUDTRegistry, fetchTypeIdCellDeps } from './cell-dep';
import { getBtcTimeLockDep, getRgbppLockDep, getUniqueTypeDep, getXudtDep } from '../constants';

describe('dynamic fetch cell dep', () => {
  it(
    'fetchTypeIdCellDeps with xudt and unique',
    async () => {
      const isMainnet = false;
      const [xudtDep, uniqueDep] = await fetchTypeIdCellDeps(isMainnet, { xudt: true, unique: true });
      expect(xudtDep.outPoint?.txHash).toBe(getXudtDep(isMainnet).outPoint?.txHash);
      expect(uniqueDep.outPoint?.txHash).toBe(getUniqueTypeDep(isMainnet).outPoint?.txHash);
    },
    { timeout: 10000 },
  );

  it(
    'fetchTypeIdCellDeps with rgbpp and config',
    async () => {
      const isMainnet = false;
      const [rgbppDep, configDep] = await fetchTypeIdCellDeps(isMainnet, { rgbpp: true });
      expect(rgbppDep.outPoint?.txHash).toBe(getRgbppLockDep(isMainnet).outPoint?.txHash);
      expect(configDep.outPoint?.index).toBe('0x1');
    },
    { timeout: 10000 },
  );

  it(
    'fetchTypeIdCellDeps with rgbpp, config and xudt',
    async () => {
      const isMainnet = false;
      const [rgbppDep, configDep, xudtDep] = await fetchTypeIdCellDeps(isMainnet, { rgbpp: true, xudt: true });
      expect(rgbppDep.outPoint?.txHash).toBe(getRgbppLockDep(isMainnet).outPoint?.txHash);
      expect(configDep.outPoint?.index).toBe('0x1');
      expect(xudtDep.outPoint?.txHash).toBe(getXudtDep(isMainnet).outPoint?.txHash);
    },
    { timeout: 10000 },
  );

  it(
    'fetchTypeIdCellDeps with btcTime and config',
    async () => {
      const isMainnet = true;
      const [btcTimeDep, configDep] = await fetchTypeIdCellDeps(isMainnet, { btcTime: true });
      expect(btcTimeDep.outPoint?.txHash).toBe(getBtcTimeLockDep(isMainnet).outPoint?.txHash);
      expect(configDep.outPoint?.index).toBe('0x1');
    },
    { timeout: 10000 },
  );

  it(
    'fetchTypeIdCellDeps with btcTime, config and xudt',
    async () => {
      const isMainnet = true;
      const [btcTimeDep, configDep, xudtDep] = await fetchTypeIdCellDeps(isMainnet, { btcTime: true, xudt: true });
      expect(btcTimeDep.outPoint?.txHash).toBe(getBtcTimeLockDep(isMainnet).outPoint?.txHash);
      expect(configDep.outPoint?.index).toBe('0x1');
      expect(xudtDep.outPoint?.txHash).toBe(getXudtDep(isMainnet).outPoint?.txHash);
    },
    { timeout: 10000 },
  );

  it(
    'fetchTypeIdCellDeps with rgbpp, btcTime, xudt and unique',
    async () => {
      const isMainnet = false;
      const cellDeps = await fetchTypeIdCellDeps(isMainnet, { rgbpp: true, btcTime: true, xudt: true, unique: true });
      expect(cellDeps[0].outPoint?.txHash).toBe(getRgbppLockDep(isMainnet).outPoint?.txHash);
      expect(cellDeps[1].outPoint?.index).toBe('0x1');

      expect(cellDeps[2].outPoint?.txHash).toBe(getBtcTimeLockDep(isMainnet).outPoint?.txHash);
      expect(cellDeps[3].outPoint?.index).toBe('0x1');

      expect(cellDeps[4].outPoint?.txHash).toBe(getXudtDep(isMainnet).outPoint?.txHash);

      expect(cellDeps[5].outPoint?.txHash).toBe(getUniqueTypeDep(isMainnet).outPoint?.txHash);
    },
    { timeout: 10000 },
  );

  it(
    'fetchTypeIdCellDeps without cell deps',
    async () => {
      const isMainnet = false;
      const cellDeps = await fetchTypeIdCellDeps(isMainnet, {});
      expect(cellDeps.length).toBe(0);
    },
    { timeout: 10000 },
  );

  it(
    'fetchTypeIdCellDeps with RUSD',
    async () => {
      const isMainnet = false;
      const cellDeps = await fetchTypeIdCellDeps(isMainnet, {
        xudt: false,
        compatibleXudtCodeHashes: ['0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a'],
      });
      expect(cellDeps[0].outPoint?.txHash).toBe('0xed7d65b9ad3d99657e37c4285d585fea8a5fcaf58165d54dacf90243f911548b');
      expect(cellDeps[0].outPoint?.index).toBe('0x0');
    },
    { timeout: 10000 },
  );

  it(
    'fetchTypeIdCellDeps with UTXOAirdropBadge',
    async () => {
      const isMainnet = false;
      const cellDeps = await fetchTypeIdCellDeps(isMainnet, {
        utxoAirdropBadge: true,
      });
      expect(cellDeps[0].outPoint?.txHash).toBe('0xbbbb73972ac260a0f7204bea707288c3970688fe8714c3246a5e9a538168a42a');
      expect(cellDeps[0].outPoint?.index).toBe('0x0');
    },
    { timeout: 10000 },
  );

  it(
    'CompatibleXUDTRegistry.getCompatibleTokens',
    async () => {
      const scripts = CompatibleXUDTRegistry.getCompatibleTokens();
      expect(scripts.length > 0).toBe(true);
      // RUSD Mainnet
      expect(scripts[0].codeHash).toBe('0x26a33e0815888a4a0614a0b7d09fa951e0993ff21e55905510104a0b1312032b');

      await CompatibleXUDTRegistry.refreshCache();
      const latestScripts = CompatibleXUDTRegistry.getCompatibleTokens();
      expect(latestScripts.length > 0).toBe(true);
      // RUSD Testnet
      expect(latestScripts[0].codeHash).toBe('0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a');
    },
    { timeout: 10000 },
  );
});
