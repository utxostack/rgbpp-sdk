import { buildSporeBtcTimeCellsSpentTx, signBtcTimeCellSpentTx } from 'rgbpp';
import { CKB_PRIVATE_KEY, btcService, ckbAddress, collector, isMainnet } from '../env';
import { sendCkbTx, getBtcTimeLockScript } from 'rgbpp/ckb';

// Warning: Wait at least 6 BTC confirmation blocks to spend the BTC time cells after 5-leap-spore-to-ckb.ts
const unlockSporeBtcTimeCell = async ({ btcTimeCellArgs }: { btcTimeCellArgs: string }) => {
  const btcTimeCells = await collector.getCells({
    lock: {
      ...getBtcTimeLockScript(false),
      args: btcTimeCellArgs,
    },
    isDataMustBeEmpty: false,
  });

  if (!btcTimeCells || btcTimeCells.length === 0) {
    throw new Error('No btc time cells found');
  }

  const ckbRawTx: CKBComponents.RawTransaction = await buildSporeBtcTimeCellsSpentTx({
    btcTimeCells,
    btcAssetsApi: btcService,
    isMainnet,
  });

  const signedTx = await signBtcTimeCellSpentTx({
    secp256k1PrivateKey: CKB_PRIVATE_KEY,
    collector,
    masterCkbAddress: ckbAddress,
    ckbRawTx,
    isMainnet,
  });

  const txHash = await sendCkbTx({ collector, signedTx });
  console.info(`Spore BTC time cell has been unlocked and tx hash is ${txHash}`);
};

// The btcTimeCellArgs is from the outputs[0].lock.args(BTC Time lock args) of the 5-leap-spore-to-ckb.ts CKB transaction
unlockSporeBtcTimeCell({
  btcTimeCellArgs:
    '0x7d00000010000000590000005d000000490000001000000030000000310000009bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce80114000000f9a9ad51ed14936d33f7bb854aaefa5f47a3ccbd060000002997fa043e977cb0a9bcc75ec308ad1323331c5295caf8fc721b0a2761bef305',
});
