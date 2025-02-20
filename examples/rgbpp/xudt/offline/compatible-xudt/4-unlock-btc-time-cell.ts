import { BtcAssetsApiError, buildBtcTimeCellsSpentTx } from 'rgbpp';
import {
  sendCkbTx,
  getBtcTimeLockScript,
  btcTxIdAndAfterFromBtcTimeLockArgs,
  prepareBtcTimeCellSpentUnsignedTx,
  addressToScriptHash,
  signCkbTransaction,
} from 'rgbpp/ckb';
import { BTC_TESTNET_TYPE, CKB_PRIVATE_KEY, btcService, ckbAddress, collector, isMainnet } from '../../../env';
import { OfflineBtcAssetsDataSource, SpvProofEntry } from 'rgbpp/service';

const unlockRusdBtcTimeCell = async ({ btcTimeCellArgs }: { btcTimeCellArgs: string }) => {
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

  const spvProofs: SpvProofEntry[] = await Promise.all(
    btcTimeCells.map(async (btcTimeCell) => {
      const { btcTxId, after } = btcTxIdAndAfterFromBtcTimeLockArgs(btcTimeCell.output.lock.args);
      let proof = null;
      let attempts = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          console.log(`Attempt ${attempts + 1}: Waiting for SPV proof for txId ${btcTxId}...`);
          proof = await btcService.getRgbppSpvProof(btcTxId, after);
          if (proof) {
            break;
          }
        } catch (error) {
          if (!(error instanceof BtcAssetsApiError)) {
            console.error(error);
            throw error;
          }
          console.log('BtcAssetsApiError', error.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
        attempts++;
      }

      return {
        txid: btcTxId,
        confirmations: after,
        proof,
      };
    }),
  );

  const offlineBtcAssetsDataSource = new OfflineBtcAssetsDataSource({
    txs: [],
    utxos: [],
    rgbppSpvProofs: spvProofs,
  });

  const ckbRawTx: CKBComponents.RawTransaction = await buildBtcTimeCellsSpentTx({
    btcTimeCells,
    btcAssetsApi: offlineBtcAssetsDataSource,
    isMainnet,
    btcTestnetType: BTC_TESTNET_TYPE,
  });

  const { ckbRawTx: unsignedTx, inputCells } = await prepareBtcTimeCellSpentUnsignedTx({
    collector,
    masterCkbAddress: ckbAddress,
    ckbRawTx,
    isMainnet,
  });

  const keyMap = new Map<string, string>();
  keyMap.set(addressToScriptHash(ckbAddress), CKB_PRIVATE_KEY);
  const signedTx = signCkbTransaction(keyMap, unsignedTx, inputCells, true);

  const txHash = await sendCkbTx({ collector, signedTx });
  console.info(`BTC time cell has been spent and CKB tx hash is ${txHash}`);
};

// The btcTimeCellArgs is from the outputs[0].lock.args(BTC Time lock args) of the 3-btc-leap-ckb.ts CKB transaction
unlockRusdBtcTimeCell({
  btcTimeCellArgs:
    '0x7d00000010000000590000005d000000490000001000000030000000310000009bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8011400000021e782eeb1c9893b341ed71c2dfe6fa496a6435c0600000086c0f54823abebbd966c5110cbdbc72cc6f6b32b81b4254b9f49788a090bcfab',
});

/* 
npx tsx examples/rgbpp/xudt/offline/compatible-xudt/4-unlock-btc-time-cell.ts
*/
