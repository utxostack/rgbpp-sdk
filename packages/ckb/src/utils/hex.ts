import { hexToBytes, bytesToHex } from '@nervosnetwork/ckb-sdk-utils';

export const remove0x = (hex: string): string => {
  if (hex.startsWith('0x')) {
    return hex.substring(2);
  }
  return hex;
};

export const append0x = (hex?: string): string => {
  return hex?.startsWith('0x') ? hex : `0x${hex}`;
};

const ArrayBufferToHex = (arrayBuffer: ArrayBuffer): string => {
  return Array.prototype.map.call(new Uint8Array(arrayBuffer), (x) => ('00' + x.toString(16)).slice(-2)).join('');
};

export const u16ToBe = (u16: number): string => {
  let buffer = new ArrayBuffer(2);
  let view = new DataView(buffer);
  view.setUint16(0, u16, false);
  return ArrayBufferToHex(buffer);
};

const u32ToHex = (u32: string | number, littleEndian?: boolean): string => {
  let buffer = new ArrayBuffer(4);
  let view = new DataView(buffer);
  view.setUint32(0, Number(u32), littleEndian);
  return ArrayBufferToHex(buffer);
};

export const u32ToBe = (u32: string | number): string => {
  return u32ToHex(u32, false);
};

export const u32ToLe = (u32: string | number): string => {
  return u32ToHex(u32, true);
};

export const leToU32 = (leHex: string): number => {
  const bytes = hexToBytes(append0x(leHex));
  const beHex = `0x${bytes.reduceRight((pre, cur) => pre + cur.toString(16).padStart(2, '0'), '')}`;
  return parseInt(beHex, 16);
};

export const utf8ToHex = (text: string) => {
  let result = text.trim();
  if (result.startsWith('0x')) {
    return result;
  }
  result = bytesToHex(new TextEncoder().encode(result));
  return result;
};

export const hexToUtf8 = (hex: string) => {
  let result = hex.trim();
  try {
    result = new TextDecoder().decode(hexToBytes(result));
  } catch (error) {
    console.error('hexToUtf8 error:', error);
  }
  return result;
};
