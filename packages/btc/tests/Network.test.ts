import { describe, expect, it } from 'vitest';
import { bitcoin, NetworkType, networkTypeToConfig, networkToConfig } from '../src';
import { networkToNetworkType, networkTypeToIsCkbMainnet, networkTypeToNetwork } from '../src';

describe('Network', () => {
  it('networkTypeToConfig()', () => {
    const testnet = networkTypeToConfig(NetworkType.TESTNET);
    expect(testnet).toBeDefined();
    expect(testnet.networkType).toBe(NetworkType.TESTNET);
    expect(testnet.network).toEqual(bitcoin.networks.testnet);

    const mainnet = networkTypeToConfig(NetworkType.MAINNET);
    expect(mainnet).toBeDefined();
    expect(mainnet.networkType).toBe(NetworkType.MAINNET);
    expect(mainnet.network).toEqual(bitcoin.networks.bitcoin);

    expect(() => networkTypeToConfig(NetworkType.REGTEST)).toThrow();
  });
  it('networkToConfig()', () => {
    const testnet = networkToConfig(bitcoin.networks.testnet);
    expect(testnet).toBeDefined();
    expect(testnet.networkType).toBe(NetworkType.TESTNET);
    expect(testnet.network).toEqual(bitcoin.networks.testnet);

    const mainnet = networkToConfig(bitcoin.networks.bitcoin);
    expect(mainnet).toBeDefined();
    expect(mainnet.networkType).toBe(NetworkType.MAINNET);
    expect(mainnet.network).toEqual(bitcoin.networks.bitcoin);

    expect(() => networkToConfig(bitcoin.networks.regtest)).toThrow();
  });
  it('networkTypeToNetwork()', () => {
    const testnet = networkTypeToNetwork(NetworkType.TESTNET);
    expect(testnet).toEqual(bitcoin.networks.testnet);

    const mainnet = networkTypeToNetwork(NetworkType.MAINNET);
    expect(mainnet).toEqual(bitcoin.networks.bitcoin);

    expect(() => networkTypeToNetwork(NetworkType.REGTEST)).toThrow();
  });
  it('networkToNetworkType()', () => {
    const testnet = networkToNetworkType(bitcoin.networks.testnet);
    expect(testnet).toEqual(NetworkType.TESTNET);

    const mainnet = networkToNetworkType(bitcoin.networks.bitcoin);
    expect(mainnet).toEqual(NetworkType.MAINNET);

    expect(() => networkToNetworkType(bitcoin.networks.regtest)).toThrow();
  });
  it('networkTypeToIsCkbMainnet()', () => {
    expect(networkTypeToIsCkbMainnet(NetworkType.TESTNET)).toBe(false);
    expect(networkTypeToIsCkbMainnet(NetworkType.MAINNET)).toBe(true);
    expect(() => networkTypeToIsCkbMainnet(NetworkType.REGTEST)).toThrow();
  });
});
