import { buildRgbppLockArgs } from '@rgbpp-sdk/ckb';
import { LeapToCkbParams, btcService, leapFromBtcToCkb } from 'examples-core';

const leapToCKB = async (params: LeapToCkbParams) => {
  const btcTxId = await leapFromBtcToCkb(params);

  try {
    const interval = setInterval(async () => {
      const { state, failedReason } = await btcService.getRgbppTransactionState(btcTxId);
      console.log('state', state);
      if (state === 'completed' || state === 'failed') {
        clearInterval(interval);
        if (state === 'completed') {
          const { txhash: txHash } = await btcService.getRgbppTransactionHash(btcTxId);
          console.info(`Rgbpp asset has been jumped from BTC to CKB and the related CKB tx hash is ${txHash}`);
        } else {
          console.warn(`Rgbpp CKB transaction failed and the reason is ${failedReason} `);
        }
      }
    }, 30 * 1000);
  } catch (error) {
    console.error(error);
  }
};

// rgbppLockArgs: outIndexU32 + btcTxId
leapToCKB({
  // If the `2-btc-transfer.ts` has been executed, the BTC txId should be the new generated BTC txId by the `2-btc-transfer.ts`
  // Otherwise the BTC txId should be same as the the BTC txId of the `1-ckb-jump-btc.ts`
  rgbppLockArgsList: [buildRgbppLockArgs(1, '6edd4b9327506fab09fb9a0f5e5f35136a6a94bd4c9dd79af04921618fa6c800')],
  toCkbAddress: 'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9kxr7vy7yknezj0vj0xptx6thk6pwyr0sxamv6q',
  xudtTypeArgs: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  transferAmount: BigInt(800_0000_0000),
});
