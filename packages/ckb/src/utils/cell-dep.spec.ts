import { describe, it, expect } from 'vitest';
import {
  fetchBtcTimeAndConfigCellDeps,
  fetchBtcTimeXudtCellDeps,
  fetchRgbppAndConfigCellDeps,
  fetchRgbppXudtCellDeps,
  fetchUniqueCellDep,
} from './cell-dep';
import { getBtcTimeLockDep, getRgbppLockDep, getUniqueTypeDep, getXudtDep } from '../constants';

describe('dynamic fetch cell dep', () => {
  it('fetchUniqueTypeCellDep', async () => {
    const isMainnet = false;
    const cellDep = await fetchUniqueCellDep(isMainnet);
    expect(cellDep.outPoint?.txHash).toBe(getUniqueTypeDep(isMainnet).outPoint?.txHash);
  });

  it('fetchRgbppLockAndConfigCellDeps', async () => {
    const isMainnet = false;
    const [rgbppDep, configDep] = await fetchRgbppAndConfigCellDeps(isMainnet);
    expect(rgbppDep.outPoint?.txHash).toBe(getRgbppLockDep(isMainnet).outPoint?.txHash);
    expect(configDep.outPoint?.index).toBe('0x1');
  });

  it('fetchRgbppXudtCellDeps', async () => {
    const isMainnet = false;
    const [rgbppDep, configDep, xudtDep] = await fetchRgbppXudtCellDeps(isMainnet);
    expect(rgbppDep.outPoint?.txHash).toBe(getRgbppLockDep(isMainnet).outPoint?.txHash);
    expect(configDep.outPoint?.index).toBe('0x1');
    expect(xudtDep.outPoint?.txHash).toBe(getXudtDep(isMainnet).outPoint?.txHash);
  });

  it('fetchBtcTimeAndConfigCellDeps', async () => {
    const isMainnet = true;
    const [btcTimeDep, configDep] = await fetchBtcTimeAndConfigCellDeps(isMainnet);
    expect(btcTimeDep.outPoint?.txHash).toBe(getBtcTimeLockDep(isMainnet).outPoint?.txHash);
    expect(configDep.outPoint?.index).toBe('0x1');
  });

  it('fetchBtcTimeXudtCellDeps', async () => {
    const isMainnet = true;
    const [btcTimeDep, configDep, xudtDep] = await fetchBtcTimeXudtCellDeps(isMainnet);
    expect(btcTimeDep.outPoint?.txHash).toBe(getBtcTimeLockDep(isMainnet).outPoint?.txHash);
    expect(configDep.outPoint?.index).toBe('0x1');
    expect(xudtDep.outPoint?.txHash).toBe(getXudtDep(isMainnet).outPoint?.txHash);
  });
});
