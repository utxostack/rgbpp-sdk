import { AddressPrefix, addressToScript, privateKeyToAddress, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import {
  Collector,
  SPVService,
  appendCkbTxWitnesses,
  appendPaymasterCellAndSignCkbTx,
  genBtcTransferCkbVirtualTx,
  sendCkbTx,
  updateCkbTxWithRealBtcTxId,
} from '@rgbpp-sdk/ckb';
import { sendRgbppUtxos, BtcAssetsApi, DataSource, NetworkType } from '@rgbpp-sdk/btc';

// SECP256K1 private key
const TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

interface Params {
  signer: any;
  rgbppLockArgsList: string[];
  toBtcAddress: string;
  transferAmount: bigint;
}
const transferRgbppOnBtc = async ({ signer, rgbppLockArgsList, toBtcAddress, transferAmount }: Params) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const address = privateKeyToAddress(TEST_PRIVATE_KEY, { prefix: AddressPrefix.Testnet });
  console.log('address: ', address);
  const fromLock = addressToScript(address);

  const networkType = NetworkType.TESTNET;
  // TODO: Use the real btc_assets_api_url and token
  const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
  const source = new DataSource(service, networkType);

  // TODO: Use the real XUDT type script
  const xudtType: CKBComponents.Script = {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  };

  const ckbVirtualTxResult = await genBtcTransferCkbVirtualTx({
    collector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount,
    isMainnet: false,
  });

  const { commitment, ckbRawTx, needPaymasterCell, sumInputsCapacity } = ckbVirtualTxResult;

  // TODO: call sendRgbppUtxos to build and sign btc tx
  const { btcTxId, btcTxBytes } = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [toBtcAddress],
    signer,
    source,
  });

  const newCkbRawTx = updateCkbTxWithRealBtcTxId({ ckbRawTx, btcTxId, isMainnet: false });

  // TODO: Use the real spv-service-url
  const spvService = new SPVService('spv-service-url');

  let ckbTx = await appendCkbTxWitnesses({
    ckbRawTx: newCkbRawTx,
    btcTxBytes,
    spvService,
    btcTxId,
    needPaymasterCell,
    sumInputsCapacity,
  });

  if (needPaymasterCell) {
    const emptyCells = await collector.getCells({ lock: fromLock });
    if (!emptyCells || emptyCells.length === 0) {
      throw new Error('The address has no empty cells');
    }
    ckbTx = await appendPaymasterCellAndSignCkbTx({
      secp256k1PrivateKey: TEST_PRIVATE_KEY,
      ckbRawTx: newCkbRawTx,
      sumInputsCapacity,
      paymasterCell: emptyCells[0],
      isMainnet: false,
    });
  }

  await sendCkbTx({ collector, signedTx: ckbTx });
};

// TODO: Use real btc utxo information
// rgbppLockArgs: outIndexU32 + btcTxId
transferRgbppOnBtc({
  signer: '',
  rgbppLockArgsList: ['0x0100000047448104a611ecb16ab8d8e500b2166689612c93fc7ef18783d8189f3079f447'],
  toBtcAddress: 'tb1qm06rvrq8jyyckzc5v709u7qpthel9j4d9f7nh3',
  transferAmount: BigInt(100_0000_0000),
});

