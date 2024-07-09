import { describe, it, expect } from 'vitest';
import { fetchTypeIdCellDeps } from './cell-dep.js';
import { getBtcTimeLockDep, getRgbppLockDep, getUniqueTypeDep, getXudtDep } from '../constants/index.js';

describe('dynamic fetch cell dep', () => {
  it('fetchTypeIdCellDeps with xudt and unique', async () => {
    const isMainnet = false;
    const [xudtDep, uniqueDep] = await fetchTypeIdCellDeps(isMainnet, { xudt: true, unique: true });
    expect(xudtDep.outPoint?.txHash).toBe(getXudtDep(isMainnet).outPoint?.txHash);
    expect(uniqueDep.outPoint?.txHash).toBe(getUniqueTypeDep(isMainnet).outPoint?.txHash);
  });

  it('fetchTypeIdCellDeps with rgbpp and config', async () => {
    const isMainnet = false;
    const [rgbppDep, configDep] = await fetchTypeIdCellDeps(isMainnet, { rgbpp: true });
    expect(rgbppDep.outPoint?.txHash).toBe(getRgbppLockDep(isMainnet).outPoint?.txHash);
    expect(configDep.outPoint?.index).toBe('0x1');
  });

  it('fetchTypeIdCellDeps with rgbpp, config and xudt', async () => {
    const isMainnet = false;
    const [rgbppDep, configDep, xudtDep] = await fetchTypeIdCellDeps(isMainnet, { rgbpp: true, xudt: true });
    expect(rgbppDep.outPoint?.txHash).toBe(getRgbppLockDep(isMainnet).outPoint?.txHash);
    expect(configDep.outPoint?.index).toBe('0x1');
    expect(xudtDep.outPoint?.txHash).toBe(getXudtDep(isMainnet).outPoint?.txHash);
  });

  it('fetchTypeIdCellDeps with btcTime and config', async () => {
    const isMainnet = true;
    const [btcTimeDep, configDep] = await fetchTypeIdCellDeps(isMainnet, { btcTime: true });
    expect(btcTimeDep.outPoint?.txHash).toBe(getBtcTimeLockDep(isMainnet).outPoint?.txHash);
    expect(configDep.outPoint?.index).toBe('0x1');
  });

  it('fetchTypeIdCellDeps with btcTime, config and xudt', async () => {
    const isMainnet = true;
    const [btcTimeDep, configDep, xudtDep] = await fetchTypeIdCellDeps(isMainnet, { btcTime: true, xudt: true });
    expect(btcTimeDep.outPoint?.txHash).toBe(getBtcTimeLockDep(isMainnet).outPoint?.txHash);
    expect(configDep.outPoint?.index).toBe('0x1');
    expect(xudtDep.outPoint?.txHash).toBe(getXudtDep(isMainnet).outPoint?.txHash);
  });

  it('fetchTypeIdCellDeps with rgbpp, btcTime, xudt and unique', async () => {
    const isMainnet = false;
    const cellDeps = await fetchTypeIdCellDeps(isMainnet, { rgbpp: true, btcTime: true, xudt: true, unique: true });
    expect(cellDeps[0].outPoint?.txHash).toBe(getRgbppLockDep(isMainnet).outPoint?.txHash);
    expect(cellDeps[1].outPoint?.index).toBe('0x1');

    expect(cellDeps[2].outPoint?.txHash).toBe(getBtcTimeLockDep(isMainnet).outPoint?.txHash);
    expect(cellDeps[3].outPoint?.index).toBe('0x1');

    expect(cellDeps[4].outPoint?.txHash).toBe(getXudtDep(isMainnet).outPoint?.txHash);

    expect(cellDeps[5].outPoint?.txHash).toBe(getUniqueTypeDep(isMainnet).outPoint?.txHash);
  });

  it('fetchTypeIdCellDeps without cell deps', async () => {
    const isMainnet = false;
    const cellDeps = await fetchTypeIdCellDeps(isMainnet, {});
    expect(cellDeps.length).toBe(0);
  });
});
