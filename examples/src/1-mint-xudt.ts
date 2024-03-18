import { AddressPrefix } from '@nervosnetwork/ckb-sdk-utils';
import { blockchain } from '@ckb-lumos/base';
import { buildMintTx, Collector } from 'ckb-omiga';

// SECP256K1 private key
const TEST_MAIN_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

const deploy = async () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });

  const address = collector
    .getCkb()
    .utils.privateKeyToAddress(TEST_MAIN_PRIVATE_KEY, { prefix: AddressPrefix.Testnet });
  // ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq98mx5lm42zd7mwyq54pg49cln850mj2957np7az
  console.log('address: ', address);

  const mintLimit = BigInt(1000) * BigInt(10 ** 8);
  const inscriptionId = '0xcd89d8f36593a9a82501c024c5cdc4877ca11c5b3d5831b3e78334aecb978f0d';

  const rawTx  = await buildMintTx({ collector, address, inscriptionId, mintLimit });

  const secp256k1Dep: CKBComponents.CellDep = {
    outPoint: {
      txHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
      index: '0x0',
    },
    depType: 'depGroup',
  };
  const witnessArgs = blockchain.WitnessArgs.unpack(rawTx.witnesses[0]) as CKBComponents.WitnessArgs;
  let unsignedTx: CKBComponents.RawTransactionToSign = {
    ...rawTx,
    cellDeps: [...rawTx.cellDeps, secp256k1Dep],
    witnesses: [witnessArgs, ...rawTx.witnesses.slice(1)],
  };
  const signedTx = collector.getCkb().signTransaction(TEST_MAIN_PRIVATE_KEY)(unsignedTx);

  console.log(JSON.stringify(signedTx));

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');
  console.info(`Xudt has been minted with tx hash ${txHash}`);
};

deploy();
