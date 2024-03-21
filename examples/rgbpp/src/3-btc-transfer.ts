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
import { sendRgbppUtxos, BtcAssetsApi, DataSource, ECPair, bitcoin, NetworkType } from '@rgbpp-sdk/btc';
import { RawTransaction } from '@ckb-lumos/base';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
// BTC SECP256K1 private key
const BTC_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

const BTC_ASSETS_API_URL = 'https://btc-assets-api-url'

const BTC_ASSETS_TOKEN ='';

interface Params {
  rgbppLockArgsList: string[];
  toBtcAddress: string;
  transferAmount: bigint;
}
const transferRgbppOnBtc = async ({ rgbppLockArgsList, toBtcAddress, transferAmount }: Params) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const ckbAddress = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, { prefix: AddressPrefix.Testnet });
  console.log('ckb address: ', ckbAddress);
  const fromLock = addressToScript(ckbAddress);

  const network = bitcoin.networks.testnet;
  const keyPair = ECPair.fromPrivateKey(
      Buffer.from(BTC_TEST_PRIVATE_KEY, 'hex'),
      {network}
    );
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network,
  });

  console.log('btc address: ', btcAddress);

  const networkType = NetworkType.TESTNET;
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, 'localhost');
  const source = new DataSource(service, networkType);

  const res = await service.getBalance(btcAddress!);
  console.log(res)

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
  const ckbVirtualTx: RawTransaction = {
    ...ckbRawTx,
    cellDeps: ckbRawTx.cellDeps.map((cellDep) => ({
      ...cellDep,
      outPoint: {
        txHash: cellDep.outPoint!.txHash,
        index: cellDep.outPoint!.index,
      },
    })),
    inputs: ckbRawTx.inputs.map((input) => ({
      ...input,
      previousOutput: {
        txHash: input.previousOutput!.txHash,
        index: input.previousOutput!.index,
      },
    })),
    outputs: ckbRawTx.outputs.map((output) => ({
      ...output,
      type: output.type!
    })),
  };


  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx,
    paymaster: {} as any,
    commitment,
    tos: [toBtcAddress],
    ckbCollector: collector,
    from: btcAddress!,
    source,
  });
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs()

  const btcTx = psbt.extractTransaction()
  console.log("BTC Tx bytes: ", btcTx.toHex())
  const btcTxBytes = btcTx.toHex()
  const { txid: btcTxId } = await service.sendTransaction(btcTx.toHex());
  console.log("BTC TxId: ", btcTxId)
  


  // Send CKB tx
  const newCkbRawTx = updateCkbTxWithRealBtcTxId({ ckbRawTx, btcTxId, isMainnet: false });

  // const spvService = new SPVService('spv-service-url');

  // const { spvClient, proof } = await spvService.fetchSpvClientCellAndTxProof({
  //   btcTxId,
  //   btcTxIndexInBlock,
  //   confirmBlocks: 0,
  // });

  const spvClientTxPoof = {
    proof:
      '0xfd02000014000000180000001c000000b90100000900000012682700990100000000e33206f49ea7c0f936bbe8626fda2de2312a6bdbf86200d58f208193390000000000ed6e2f1ce0e1d69448bdadf3ef775b8a5f50305982bd0c78417f46f27bf69eef6db6f865434e2c196ddee2508e0100000aebfbc45a28d846c8aea2e7177a4e7f7b5917908b7c7634f33afcda1f9442ac17451d07b3280e8f93608efb6d05512bb60ce7348589b265980706e8d46c0cbcb87b169707bb60cd5a0a767296245844e60da760a67f1768567e8374bf90d621879ecd01d1e57a2fa8a56c526bdb96b2ee3c5c568855f388fa4e2e9a86fd00500089aaf298e9bae966573df1e75c002d3c6b1942df1604972a1d1628299c9eb6b39bacc1fa06531fe0a1464b6d24a46bf270c7967de7b855cf7b7cbd996983dc49bc0b139d7c644b2c8194d7ee7853dce824ba3be839033435152130b13e497868d3c78128aad0ef5b9acc42fb6f7b9f611f8abf977f9ec32d5499fc334f8e0a1c5614d2d44bb9cbb5e62442b81c1aed4ddc107bac6acba5625d83e73f3555a168eb11c8179012a9495aeb6e409b08d590b83ae8cf51b09e7f4af8ac98b487139403ff03000800000013682700136827007abf04799c3dcc6dc3a31141871ff0e75d6fd20cc3de60333a6f3500000000001068270011682700a70ce4cd81071c1a622a866af96d4ea99e40b17b9e3ca9b46d3d8875e44597a2146827001768270028fcded2ce220ec5d8be87d738874d4beaf776aa87f847fc9b069a2316695782186827001f682700059eefbd3fb12f80ca2351ef299894348e8c997dc12210d6031bf6eafcb234a9006827000f68270012057bbb293167d715e60dde0f65c1350ae8f7bc0e39e891bbf02f3778d46309e0672700ff67270066ba494cde9f34c736dd133504a97955a5ac0a357e554b05de0408a00f904c27206827005f6827002243be09cbebdd2c6ce4a669ed3f6a361f56c13e936fbbe6cca77e46e470220660682700da68270011fbaa20bf2bb2281088201fb738bdb625b90708dcbbfce1c5df625cd8216d0d',
    spvClient: {
      index: '0x1',
      txHash: '0x24b6ae4f47e5b6cada9bb09f776e00f2658b6b78b69b0274a51fdccb8d7d879c',
    },
  };

  let ckbTx = await appendCkbTxWitnesses({
    ckbRawTx: newCkbRawTx,
    btcTxBytes,
    spvClientTxPoof,
    btcTxId,
    needPaymasterCell,
    sumInputsCapacity,
  });

  console.log(JSON.stringify(ckbTx))

  // await sendCkbTx({ collector, signedTx: ckbTx });
};


// TODO: Use real btc utxo information
// rgbppLockArgs: outIndexU32 + btcTxId
transferRgbppOnBtc({
  rgbppLockArgsList: ['0x00000000b30798e98172dac6d1dae87a49447d612e4e813458d0955c04bbf55907551e05'],
  toBtcAddress: 'tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt',
  transferAmount: BigInt(500_0000_0000),
});

