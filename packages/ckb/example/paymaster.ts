import { AddressPrefix, privateKeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
import { splitMultiCellsWithSecp256k1 } from '../src/paymaster';
import { Collector } from '../src/collector';

// SECP256K1 private key
const MASTER_SECP256K1_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
const RECEIVER_ADDRESS =
  'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqqxqyukftmpfang0z2ks6w6syjutass94fujlf09a';

const splitPaymasterCells = async () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const address = privateKeyToAddress(MASTER_SECP256K1_PRIVATE_KEY, { prefix: AddressPrefix.Testnet });
  console.log('master address: ', address);

  // Split 200 cells whose capacity are 316CKB for the receiver address
  await splitMultiCellsWithSecp256k1({
    masterPrivateKey: MASTER_SECP256K1_PRIVATE_KEY,
    collector,
    receiverAddress: RECEIVER_ADDRESS,
    capacityWithCKB: 316,
    cellAmount: 200,
  });
};

splitPaymasterCells();
