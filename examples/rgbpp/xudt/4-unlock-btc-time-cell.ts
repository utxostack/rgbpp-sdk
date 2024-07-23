import { buildBtcTimeCellsSpentTx, signBtcTimeCellSpentTx } from 'rgbpp';
import { sendCkbTx, getBtcTimeLockScript } from 'rgbpp/ckb';
import { BTC_TESTNET_TYPE, CKB_PRIVATE_KEY, btcService, ckbAddress, collector, isMainnet } from '../env';

// Warning: Wait at least 6 BTC confirmation blocks to spend the BTC time cells after 3-btc-leap-ckb.ts
const unlockBtcTimeCell = async ({ btcTimeCellArgs }: { btcTimeCellArgs: string }) => {
  const btcTimeCells = await collector.getCells({
    lock: {
      ...getBtcTimeLockScript(isMainnet, BTC_TESTNET_TYPE),
      args: btcTimeCellArgs,
    },
    isDataMustBeEmpty: false,
  });

  if (!btcTimeCells || btcTimeCells.length === 0) {
    throw new Error('No btc time cell found');
  }

  const ckbRawTx: CKBComponents.RawTransaction = await buildBtcTimeCellsSpentTx({
    btcTimeCells,
    btcAssetsApi: btcService,
    isMainnet,
    btcTestnetType: BTC_TESTNET_TYPE,
  });

  const signedTx = await signBtcTimeCellSpentTx({
    secp256k1PrivateKey: CKB_PRIVATE_KEY,
    collector,
    masterCkbAddress: ckbAddress,
    ckbRawTx,
    isMainnet,
  });

  const txHash = await sendCkbTx({ collector, signedTx });
  console.info(`BTC time cell has been spent and CKB tx hash is ${txHash}`);
};

// The btcTimeCellArgs is from the outputs[0].lock.args(BTC Time lock args) of the 3-btc-leap-ckb.ts CKB transaction
unlockBtcTimeCell({
  btcTimeCellArgs:
    '0x7d00000010000000590000005d000000490000001000000030000000310000009bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce80114000000f9a9ad51ed14936d33f7bb854aaefa5f47a3ccbd14000000b83a6014c458544360730d97e0ae5f36ecf6335f73afadf8eb10f84487392a27',
});
