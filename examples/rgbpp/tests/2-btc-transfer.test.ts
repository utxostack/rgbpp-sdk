import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { buildRgbppLockArgs, genBtcTransferCkbVirtualTx } from '@rgbpp-sdk/ckb';
import { sendRgbppUtxos } from '@rgbpp-sdk/btc';
import { getDeployVariables, readStepLog } from './shared/utils';
import { describe, it } from 'vitest';

// 定义转账函数
const transferRgbppOnBtc = async ({ rgbppLockArgsList, toBtcAddress, transferAmount }) => {
  await new Promise(resolve => setTimeout(resolve, 30 * 1000));
  const { collector, btcAddress, isMainnet, btcKeyPair, source, service } = getDeployVariables();

  const xudtType = {
    codeHash: readStepLog('1').codeHash,
    hashType: readStepLog('1').hashType,
    args: readStepLog('1').args,
  };

  const ckbVirtualTxResult = await genBtcTransferCkbVirtualTx({
    collector,
    rgbppLockArgsList,
    xudtTypeBytes: serializeScript(xudtType),
    transferAmount,
    isMainnet,
  });

  const { commitment, ckbRawTx } = ckbVirtualTxResult;

  // 发送 BTC 交易
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [toBtcAddress],
    ckbCollector: collector,
    from: btcAddress,
    source,
  });
  psbt.signAllInputs(btcKeyPair);
  psbt.finalizeAllInputs();

  const btcTx = psbt.extractTransaction();
  const { txid: btcTxId } = await service.sendBtcTransaction(btcTx.toHex());
  if (!btcTxId) {
    throw new Error('Transaction hash is empty. Failed to transfer RGBPP asset from BTC to BTC.');
  }

  console.log('BTC TxId: ', btcTxId);

  try {
    await service.sendRgbppCkbTransaction({ btc_txid: btcTxId, ckb_virtual_result: ckbVirtualTxResult });

    let state = '';
    while (state !== 'completed' && state !== 'failed') {
      const { state: currentState } = await service.getRgbppTransactionState(btcTxId);
      state = currentState;
      await new Promise(resolve => setTimeout(resolve, 30 * 1000));
    }

    if (state === 'completed') {
      const { txhash: txHash } = await service.getRgbppTransactionHash(btcTxId);
      console.info(`Rgbpp asset has been transferred on BTC and the related CKB tx hash is ${txHash}`);
    } else {
      console.warn(`Rgbpp CKB transaction failed`);
    }
  } catch (error) {
    console.error(error);
  }

};

describe('btc-transfer', () => {
  it('2-btc-transfer.test', async () => {
    await transferRgbppOnBtc({
      rgbppLockArgsList: [buildRgbppLockArgs(readStepLog('0').index, readStepLog('0').txid)],
      toBtcAddress: 'tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt',
      transferAmount: BigInt(800_0000_0000),
    });
  }, 5000000);
});
