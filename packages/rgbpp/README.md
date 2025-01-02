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

The function `buildRgbppTransferTx` will generate a CKB virtual transaction and a related BTC transaction with the commitment for the RGB++ assets transfer on BTC. 

The `btcPsbtHex` can be used to construct bitcoin PSBT to sign and send BTC transaction with BTC wallet, and then the BTC transaction id and `ckbVirtualTxResult` will be used to post to RGB++ Queue Service to complete the isomorphic CKB transaction.

```TypeScript
const { ckbVirtualTxResult, btcPsbtHex } = await buildRgbppTransferTx({
  ckb: {
    collector,
    xudtTypeArgs,
    rgbppLockArgsList,
    transferAmount,
    ckbFeeRate,
    // If the asset is compatible xUDT(not standard xUDT), the compatibleXudtTypeScript is required
    compatibleXudtTypeScript,
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

// Construct PSBT with btcPsbtHex to sign and send BTC transaction with the BTC key pair
const psbt = bitcoin.Psbt.fromHex(btcPsbtHex);
psbt.signAllInputs(btcKeyPair);
psbt.finalizeAllInputs();

const btcTx = psbt.extractTransaction();
const { txid: btcTxId } = await btcService.sendBtcTransaction(btcTx.toHex());

// Post the BTC txId and ckbVirtualTxResult to the RGB++ Queue Service
await btcService.sendRgbppCkbTransaction({ btc_txid: btcTxId, ckb_virtual_result: ckbVirtualTxResult });
```

## Transfer all balance of an RGB++ Asset on BTC

Similar to using the `buildRgbppTransferTx` function, the function `buildRgbppTransferAllTxs` will generate a list of RGB++ transaction groups (a transaction group includes a CKB virtual transaction and a BTC isomorphic transaction).

You should sign all the PSBTs in the `transactions` and send all the BTC transactions, and then post all the BTC txIds and ckbVirtualTxResults to the RGB++ Queue Service. You can also review the transfer details in the `summary` object.

```TypeScript
const { transactions, summary } = await buildRgbppTransferAllTxs({
  ckb: {
    // The type script args of the target RGB++ xUDT
    xudtTypeArgs,
    // The collector that collects CKB live cells and transactions
    collector,
    // The CKB transaction fee rate, default value is 1100
    feeRate,
    // (Optional) If the asset is compatible xUDT(not standard xUDT), the compatibleXudtTypeScript is required
    compatibleXudtTypeScript,
  },
  btc: {
    // The list of BTC addresses to provide RGB++ xUDT assets
    // All available amounts of the target asset (specified by ckb.xudtTypeArgs) will be included in the transfers
    // However, if more than 40 cells are bound to the same UTXO, the amounts within those 40 cells are excluded
    assetAddresses,
    // The BTC address for paying all the transaction costs, but not provide any RGB++ xUDT assets
    fromAddress,
    // The BTC address for receiving all the RGB++ xUDT assets
    toAddress,
    // The data source for collecting Bitcoin-related info
    dataSource,
    // The public key of sender BTC address, must fill if the fromAddress is a P2TR address
    fromPubkey,
    // The map helps find the corresponding public key of a BTC address,
    // note that you must specify a pubkey for each P2TR address in assetAddresses/fromAddress
    pubkeyMap,
    // The BTC address to return change satoshi, default value is fromAddress
    changeAddress,
    // The fee rate of the BTC transactions, will use the fastest fee rate if not specified
    feeRate,
  },
  // True is for BTC and CKB Mainnet, false is for BTC Testnet3/Signet and CKB Testnet
  isMainnet,
});

// Sign BTC PSBTs with all the related BTC key pairs, and convert them to BTC transactions
const signedGroups: RgbppTxGroup[] = transactions.map((group) => {
  const psbt = bitcoin.Psbt.fromHex(group.btc.psbtHex);
  signPsbt(psbt, keyPair);
  psbt.finalizeAllInputs();

  return {
    ckbVirtualTxResult: JSON.stringify(group.ckb.virtualTxResult),
    btcTxHex: psbt.extractTransaction().toHex(),
  };
});

// Post the transaction groups to the RGB++ Queue Service
const sentResult = await sendRgbppTxGroups({
  txGroups: signedGroups,
  btcService: btcSource.service,
});

// Review the summary of the transfer
console.log(summary);
```
