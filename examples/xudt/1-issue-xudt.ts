import { RgbppTokenInfo } from '@rgbpp-sdk/ckb';
import { issueXudt } from './src/core';

const XUDT_TOKEN_INFO: RgbppTokenInfo = {
  decimal: 8,
  name: 'XUDT Test Token',
  symbol: 'XTT',
};

issueXudt({ xudtTotalAmount: BigInt(2100_0000), tokenInfo: XUDT_TOKEN_INFO });
