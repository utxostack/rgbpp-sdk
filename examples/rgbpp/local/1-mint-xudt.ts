import { AddressPrefix, privateKeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
import { blockchain } from '@ckb-lumos/base';
import { buildMintTx, Collector } from 'ckb-omiga';
import { getSecp256k1CellDep } from '@rgbpp-sdk/ckb';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

// To simplify, we reuse the Omiga protocol to quickly issue XUDT assets on Testnet CKB
const mintXudt = async () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const isMainnet = false
  const address = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, { prefix: isMainnet? AddressPrefix.Mainnet: AddressPrefix.Testnet });
  // ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq0e4xk4rmg5jdkn8aams492a7jlg73ue0gc0ddfj
  console.log('ckb address: ', address);

  const mintLimit = BigInt(1000) * BigInt(10 ** 8);
  const inscriptionId = '0xd378891e711cf5c612321b7f51529215187403c61cbb27bc4413fded871b73d5';

  const rawTx = await buildMintTx({ collector, address, inscriptionId, mintLimit });

  const witnessArgs = blockchain.WitnessArgs.unpack(rawTx.witnesses[0]) as CKBComponents.WitnessArgs;
  let unsignedTx: CKBComponents.RawTransactionToSign = {
    ...rawTx,
    cellDeps: [...rawTx.cellDeps, getSecp256k1CellDep(isMainnet)],
    witnesses: [witnessArgs, ...rawTx.witnesses.slice(1)],
  };
  const signedTx = collector.getCkb().signTransaction(CKB_TEST_PRIVATE_KEY)(unsignedTx);

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  console.info(`Xudt has been minted with tx hash ${txHash}`);
};

mintXudt();

