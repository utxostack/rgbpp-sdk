# rgbpp

RGB++ SDK

A root package to integrate of common functions from the RGB++ SDK sub-packages(btc/ckb/service).

## Installation

```
$ npm i rgbpp
# or
$ yarn add rgbpp
# or
$ pnpm add rgbpp
```

## Transfer RGB++ Assets on BTC

The function `buildRgbppTransferTx` will generate CKB virtual transaction and related BTC transaction with the commitment for the RGB++ assets transfer on BTC. 

The `btcPsbtHex` can be used to construct bitcoin PSBT to sign and send BTC transaction with BTC wallet, and then the BTC transaction id and `ckbVirtualTxResult` will be used to post to RGB++ Queue Service to complete the isomorphic CKB transaction.

```TypeScript
const { ckbVirtualTxResult, btcPsbtHex } = await buildRgbppTransferTx({
  ckb: {
    collector,
    xudtTypeArgs,
    rgbppLockArgsList,
    transferAmount,
    ckbFeeRate,
  },
  btc: {
    fromBtcAddress,
    toBtcAddress,
    btcDataSource,
    fromPubkey,
    feeRate
  },
  isMainnet,
});

// Construct SPBT with btcPsbtHex to sign and send BTC transaction with the BTC key pair
const psbt = bitcoin.Psbt.fromHex(btcPsbtHex);
psbt.signAllInputs(btcKeyPair);
psbt.finalizeAllInputs();

const btcTx = psbt.extractTransaction();
const { txid: btcTxId } = await btcService.sendBtcTransaction(btcTx.toHex());

// Post the BTC txId and ckbVirtualTxResult to the RGB++ Queue Service
await btcService.sendRgbppCkbTransaction({ btc_txid: btcTxId, ckb_virtual_result: ckbVirtualTxResult });
```