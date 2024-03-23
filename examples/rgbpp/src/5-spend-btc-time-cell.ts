import signWitnesses from '@nervosnetwork/ckb-sdk-core/lib/signWitnesses';
import {
  AddressPrefix,
  addressToScript,
  getTransactionSize,
  rawTransactionToHash,
  scriptToHash,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils';
import {
  Collector,
  SPVService,
  sendCkbTx,
  buildBtcTimeCellsSpentTx,
  getBtcTimeLockScript,
  SECP256K1_WITNESS_LOCK_SIZE,
  calculateTransactionFee,
  append0x,
} from '@rgbpp-sdk/ckb';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

const SPV_SERVICE_URL = 'https://spv-service-url';

interface Params {
  btcTimeCellArgs: string;
}
const spendBtcTimeCell = async ({ btcTimeCellArgs }: Params) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const address = collector.getCkb().utils.privateKeyToAddress(CKB_TEST_PRIVATE_KEY, { prefix: AddressPrefix.Testnet });
  // ckt1qyq0n2dd28k3fymdx0mmhp224ma973arej7s9jvjju
  console.log('ckb address: ', address);
  const fromLock = addressToScript(address);
  const emptyCells = await collector.getCells({
    lock: fromLock,
  });
  if (!emptyCells || emptyCells.length === 0) {
    throw new Error('No empty cell found');
  }
  const emptyInput: CKBComponents.CellInput = {
    previousOutput: emptyCells[0].outPoint,
    since: '0x0',
  };

  const btcTimeCells = await collector.getCells({
    lock: {
      ...getBtcTimeLockScript(false),
      args: btcTimeCellArgs,
    },
    isDataEmpty: false,
  });

  if (!btcTimeCells || btcTimeCells.length === 0) {
    throw new Error('No btc time cell found');
  }
  // ignore spv proof now
  const btcTimeCellPairs = [{ btcTimeCell: btcTimeCells[0], btcTxIndexInBlock: 0 }];

  const spvService = new SPVService(SPV_SERVICE_URL);
  let ckbRawTx: CKBComponents.RawTransactionToSign = await buildBtcTimeCellsSpentTx({
    btcTimeCellPairs,
    spvService,
    isMainnet: false,
  });

  const secp256k1Dep: CKBComponents.CellDep = {
    outPoint: {
      txHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
      index: '0x0',
    },
    depType: 'depGroup',
  };
  const changeOutput = emptyCells[0].output;
  ckbRawTx = {
    ...ckbRawTx,
    cellDeps: [secp256k1Dep, ...ckbRawTx.cellDeps],
    inputs: [emptyInput, ...ckbRawTx.inputs],
    outputs: [changeOutput, ...ckbRawTx.outputs],
    outputsData: ['0x', ...ckbRawTx.outputsData],
    witnesses: [{ lock: '', inputType: '', outputType: '' }, ...ckbRawTx.witnesses],
  };

  const txSize = getTransactionSize(ckbRawTx) + SECP256K1_WITNESS_LOCK_SIZE;
  const estimatedTxFee = calculateTransactionFee(txSize);

  const changeCapacity = BigInt(emptyCells[0].output.capacity) - estimatedTxFee;
  ckbRawTx.outputs[0].capacity = append0x(changeCapacity.toString(16));

  let keyMap = new Map<string, string>();
  keyMap.set(scriptToHash(fromLock), CKB_TEST_PRIVATE_KEY);
  keyMap.set(scriptToHash(btcTimeCells[0].output.lock), '');

  const cells = ckbRawTx.inputs.map((input, index) => ({
    outPoint: input.previousOutput,
    lock: index === 0 ? fromLock : btcTimeCells[0].output.lock,
  }));

  const transactionHash = rawTransactionToHash(ckbRawTx);
  const signedWitnesses = signWitnesses(keyMap)({
    transactionHash,
    witnesses: ckbRawTx.witnesses,
    inputCells: cells,
    skipMissingKeys: true,
  });

  const signedTx = {
    ...ckbRawTx,
    witnesses: signedWitnesses.map((witness) =>
      typeof witness !== 'string' ? serializeWitnessArgs(witness) : witness,
    ),
  } as CKBComponents.RawTransaction;

  console.log(JSON.stringify(signedTx));

  const txHash = await sendCkbTx({ collector, signedTx });
  console.info(`BTC time cell has been spent and tx hash is ${txHash}`);
};

spendBtcTimeCell({
  btcTimeCellArgs:
    '0x7f000000100000005b0000005f0000004b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac011600000000016c61f984f12d3c8a4f649e60acda5deda0b8837c060000004abc778213bc4da692f93745c2b07410ef2bfaee70417784d4ee8969fb258001',
});
