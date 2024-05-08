import { RgbppTokenInfo } from '@rgbpp-sdk/ckb';
import { transferXudt } from './src/core';

const XUDT_TOKEN_INFO: RgbppTokenInfo = {
  decimal: 8,
  name: 'XUDT Test Token',
  symbol: 'XTT',
};

transferXudt({
  // The xudtType comes from 1-issue-xudt
  xudtType: {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '0x562e4e8a2f64a3e9c24beb4b7dd002d0ad3b842d0cc77924328e36ad114e3ebe',
  },
  receivers: [
    {
      toAddress: 'ckt1qyqpyw8j7tlu3v44am8d54066zrzk4vz5lvqat8fpf',
      transferAmount: BigInt(1000) * BigInt(10 ** XUDT_TOKEN_INFO.decimal),
    },
    {
      toAddress: 'ckt1qyqpyw8j7tlu3v44am8d54066zrzk4vz5lvqat8fpf',
      transferAmount: BigInt(2000) * BigInt(10 ** XUDT_TOKEN_INFO.decimal),
    },
  ],
});
