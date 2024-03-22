import { AddressPrefix, addressToScript, privateKeyToAddress, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import {
  Collector,
  SPVService,
  appendCkbTxWitnesses,
  appendPaymasterCellAndSignCkbTx,
  genBtcJumpCkbVirtualTx,
  sendCkbTx,
  updateCkbTxWithRealBtcTxId,
} from '@rgbpp-sdk/ckb';
import { sendRgbppUtxos, BtcAssetsApi, DataSource, NetworkType, bitcoin, ECPair } from '@rgbpp-sdk/btc';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
// BTC SECP256K1 private key
const BTC_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

const BTC_ASSETS_API_URL = 'https://btc-assets-api-url'

const BTC_ASSETS_TOKEN ='';

const SPV_SERVICE_URL = 'https://spv-service-url';

interface Params {
  rgbppLockArgsList: string[];
  toCkbAddress: string;
  transferAmount: bigint;
}
const jumpFromBtcToCkb = async ({ rgbppLockArgsList, toCkbAddress, transferAmount }: Params) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const address = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, { prefix: AddressPrefix.Testnet });
  console.log('ckb address: ', address);
  const fromLock = addressToScript(address);

  const network = bitcoin.networks.testnet;
  const keyPair = ECPair.fromPrivateKey(Buffer.from(BTC_TEST_PRIVATE_KEY, 'hex'), { network });
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network,
  });

  console.log('btc address: ', btcAddress);

  const networkType = NetworkType.TESTNET;
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, 'localhost');
  const source = new DataSource(service, networkType);

  const res = await service.getBalance(btcAddress!);
  console.log(res);

  // TODO: Use the real XUDT type script
  const xudtType: CKBComponents.Script = {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
  };

  const ckbVirtualTxResult = await genBtcJumpCkbVirtualTx({
    collector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount,
    toCkbAddress,
    isMainnet: false,
  });

  const { commitment, ckbRawTx, needPaymasterCell, sumInputsCapacity } = ckbVirtualTxResult;

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    paymaster: {} as any,
    commitment,
    tos: [btcAddress!],
    ckbCollector: collector,
    from: btcAddress!,
    source,
  });
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  const btcTx = psbt.extractTransaction();
  console.log('BTC Tx bytes: ', btcTx.toHex());
  const btcTxBytes = btcTx.toHex();
  const { txid: btcTxId } = await service.sendTransaction(btcTx.toHex());
  console.log('BTC TxId: ', btcTxId);

  const newCkbRawTx = updateCkbTxWithRealBtcTxId({ ckbRawTx, btcTxId, isMainnet: false });

  // TODO: Use the real spv-service-url
  const spvService = new SPVService(SPV_SERVICE_URL);

  let ckbTx = await appendCkbTxWitnesses({
    ckbRawTx: newCkbRawTx,
    btcTxBytes,
    spvService,
    btcTxIndexInBlock: 0, // ignore spv proof now
    btcTxId,
    needPaymasterCell,
    sumInputsCapacity,
  });

  // if (needPaymasterCell) {
  //   const emptyCells = await collector.getCells({ lock: fromLock });
  //   if (!emptyCells || emptyCells.length === 0) {
  //     throw new Error('The address has no empty cells');
  //   }
  //   ckbTx = await appendPaymasterCellAndSignCkbTx({
  //     secp256k1PrivateKey: CKB_TEST_PRIVATE_KEY,
  //     ckbRawTx: newCkbRawTx,
  //     sumInputsCapacity,
  //     paymasterCell: emptyCells[0],
  //     isMainnet: false,
  //   });
  // }

  await sendCkbTx({ collector, signedTx: ckbTx });
};

// TODO: Use real btc utxo information
// rgbppLockArgs: outIndexU32 + btcTxId
jumpFromBtcToCkb({
  rgbppLockArgsList: ['0x0100000047448104a611ecb16ab8d8e500b2166689612c93fc7ef18783d8189f3079f447'],
  toCkbAddress: 'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9kxr7vy7yknezj0vj0xptx6thk6pwyr0sxamv6q',
  transferAmount: BigInt(800_0000_0000),
});

