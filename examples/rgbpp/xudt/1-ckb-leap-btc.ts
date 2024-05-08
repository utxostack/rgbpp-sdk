import { leapFromCkbToBtc } from '../core';

// Use your real BTC UTXO information on the BTC Testnet
leapFromCkbToBtc({
  outIndex: 1,
  btcTxId: '4ff1855b64b309afa19a8b9be3d4da99dcb18b083b65d2d851662995c7d99e7a',
  xudtTypeArgs: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  transferAmount: BigInt(800_0000_0000),
});
