import { addressToScript, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { genCkbJumpBtcVirtualTx } from 'rgbpp';
import { getSecp256k1CellDep, buildRgbppLockArgs, getXudtTypeScript, signCkbTransaction } from 'rgbpp/ckb';
import {
  CKB_PRIVATE_KEY,
  isMainnet,
  collector,
  ckbAddress,
  BTC_TESTNET_TYPE,
  initOfflineCkbCollector,
  vendorCellDeps,
} from '../../env';

interface LeapToBtcParams {
  outIndex: number;
  btcTxId: string;
  xudtTypeArgs: string;
  transferAmount: bigint;
}

const leapFromCkbToBtc = async ({ outIndex, btcTxId, xudtTypeArgs, transferAmount }: LeapToBtcParams) => {
  const toRgbppLockArgs = buildRgbppLockArgs(outIndex, btcTxId);

  // Warning: Please replace with your real xUDT type script here
  const xudtType: CKBComponents.Script = {
    ...getXudtTypeScript(isMainnet),
    args: xudtTypeArgs,
  };

  const { collector: offlineCollector } = await initOfflineCkbCollector([
    { lock: addressToScript(ckbAddress), type: xudtType },
    { lock: addressToScript(ckbAddress) },
  ]);

  const ckbRawTx = await genCkbJumpBtcVirtualTx({
    collector: offlineCollector,
    fromCkbAddress: ckbAddress,
    toRgbppLockArgs,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount,
    btcTestnetType: BTC_TESTNET_TYPE,
    vendorCellDeps,
  });

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const unsignedTx: CKBComponents.RawTransactionToSign = {
    ...ckbRawTx,
    cellDeps: [...ckbRawTx.cellDeps, getSecp256k1CellDep(isMainnet)],
    witnesses: [emptyWitness, ...ckbRawTx.witnesses.slice(1)],
  };

  const signedTx = signCkbTransaction(CKB_PRIVATE_KEY, unsignedTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  console.info(`Rgbpp asset has been jumped from CKB to BTC and CKB tx hash is ${txHash}`);
};

// Please use your real BTC UTXO information on the BTC Testnet
// BTC Testnet3: https://mempool.space/testnet
// BTC Signet: https://mempool.space/signet
leapFromCkbToBtc({
  outIndex: 0,
  btcTxId: 'c1db31abe6bab345b5d5ab4a19c8f34c8cfe23efa4ec6bfa7b05c8e7b4f965b8',
  // Please use your own RGB++ xudt asset's xudtTypeArgs
  xudtTypeArgs: '0xe402314a4b31223afe00a9c69c0b872863b990219525e1547ec05d9d88434b24',
  transferAmount: BigInt(10_0000_0000),
});

/* 
npx tsx examples/rgbpp/xudt/offline/6-ckb-leap-btc.ts
*/
