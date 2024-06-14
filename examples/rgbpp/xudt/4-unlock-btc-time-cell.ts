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
    '0x7f000000100000005b0000005f0000004b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac011600000000016c61f984f12d3c8a4f649e60acda5deda0b8837c06000000799a0f55202939e6801924c87c66df75932ecf79774370beebe31eaa94b6d8b8',
});
