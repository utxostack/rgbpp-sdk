import { AddressPrefix, addressToScript, getTransactionSize, privateKeyToAddress, scriptToHash } from '@nervosnetwork/ckb-sdk-utils';
import { getSecp256k1CellDep,Collector, NoLiveCellError, calculateUdtCellCapacity, MAX_FEE, MIN_CAPACITY, getXudtTypeScript, append0x, getUniqueTypeScript, u128ToLe, encodeRgbppTokenInfo, getXudtDep, getUniqueTypeDep, SECP256K1_WITNESS_LOCK_SIZE, calculateTransactionFee, generateUniqueTypeArgs } from '@rgbpp-sdk/ckb';
import { calculateXudtTokenInfoCellCapacity } from '@rgbpp-sdk/ckb/src/utils';
import { XUDT_TOKEN_INFO } from './0-token-info';

// CKB SECP256K1 private key
const CKB_TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

/**
 * issueXudt can be used to issue xUDT assets with unique cell as token info cell.
 * @param: xudtTotalAmount The xudtTotalAmount specifies the total amount of asset issuance
 */
const issueXudt = async ({ xudtTotalAmount }: { xudtTotalAmount: bigint }) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const isMainnet = false;
  const issueAddress = privateKeyToAddress(CKB_TEST_PRIVATE_KEY, {
    prefix: isMainnet ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
  });
  console.log('ckb address: ', issueAddress);

  const issueLock = addressToScript(issueAddress);

  const emptyCells = await collector.getCells({
    lock: issueLock,
  });
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellError('The address has no empty cells');
  }

  const xudtCapacity = calculateUdtCellCapacity(issueLock);
  const xudtInfoCapacity = calculateXudtTokenInfoCellCapacity(XUDT_TOKEN_INFO, issueLock);

  let txFee = MAX_FEE;
  const { inputs, sumInputsCapacity } = collector.collectInputs(
    emptyCells,
    xudtCapacity + xudtInfoCapacity,
    txFee,
    { minCapacity: MIN_CAPACITY },
  );

  const xudtType: CKBComponents.Script = {
    ...getXudtTypeScript(isMainnet),
    args: append0x(scriptToHash(issueLock))
  }

  console.log('xUDT type script', xudtType)

  let changeCapacity = sumInputsCapacity - xudtCapacity - xudtInfoCapacity;
  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: issueLock,
      type: xudtType,
      capacity: append0x(xudtCapacity.toString(16)),
    },
    {
      lock: issueLock,
      type: { 
        ...getUniqueTypeScript(isMainnet),
        args: generateUniqueTypeArgs(inputs[0], 1)
      },
      capacity: append0x(xudtInfoCapacity.toString(16)),
    },
    {
      lock: issueLock,
      capacity: append0x(changeCapacity.toString(16)),
    },
  ];
  const totalAmount = xudtTotalAmount * BigInt(10 ** XUDT_TOKEN_INFO.decimal);
  const outputsData = [append0x(u128ToLe(totalAmount)), encodeRgbppTokenInfo(XUDT_TOKEN_INFO), '0x'];

  const emptyWitness = { lock: '', inputType: '', outputType: '' };
  const witnesses = inputs.map((_, index) => (index === 0 ? emptyWitness : '0x'));

  const cellDeps = [getSecp256k1CellDep(isMainnet), getUniqueTypeDep(isMainnet), getXudtDep(isMainnet)];

  const unsignedTx = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  if (txFee === MAX_FEE) {
    const txSize = getTransactionSize(unsignedTx) + SECP256K1_WITNESS_LOCK_SIZE;
    const estimatedTxFee = calculateTransactionFee(txSize);
    changeCapacity -= estimatedTxFee;
    unsignedTx.outputs[unsignedTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));
  }

  const signedTx = collector.getCkb().signTransaction(CKB_TEST_PRIVATE_KEY)(unsignedTx);
  const txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough');

  console.info(`xUDT asset has been issued and tx hash is ${txHash}`);
};

issueXudt({xudtTotalAmount: BigInt(2100_0000)});
