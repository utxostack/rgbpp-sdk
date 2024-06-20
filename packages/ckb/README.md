# @rgbpp-sdk/ckb

RGB++ CKB SDK

## Installation

```
$ npm i @rgbpp-sdk/ckb
# or
$ yarn add @rgbpp-sdk/ckb
# or
$ pnpm add @rgbpp-sdk/ckb
```

## Split paymaster cells

The `example/paymaster.ts` demonstrates how to use `@rgbpp-sdk/ckb` SDK to split multiple cells and you can set the parameters as blow:

- `receiverAddress`: The receiver ckb address
- `capacityWithCKB`: The capacity(unit is CKB) of each cell, for example: 316CKB
- `cellAmount`: The amount of cells to be split

```bash
cd packages/ckb && pnpm splitCells
```

## RGB++ xUDT Transfer on BTC

The method `genBtcTransferCkbVirtualTx` can generate a CKB virtual transaction which contains the necessary `inputCells/outputCells` for RGB++ xUDT transfer and the commitment to be inserted to the BTC tx OP_RETURN.

```TypeScript
export interface BtcTransferVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: Hex;
}

/**
 * Generate the virtual ckb transaction for the btc transfer tx
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred, if the noMergeOutputCells is true, the transferAmount will be ignored
 * @param isMainnet True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet(see btcTestnetType for details about BTC Testnet)
 * @param witnessLockPlaceholderSize(Optional) The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param noMergeOutputCells(Optional) The noMergeOutputCells indicates whether the CKB outputs need to be merged. By default, the outputs will be merged.
 * @param ckbFeeRate(Optional) The CKB transaction fee rate, default value is 1100
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const genBtcTransferCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  transferAmount,
  isMainnet,
  witnessLockPlaceholderSize,
  noMergeOutputCells,
  ckbFeeRate,
  btcTestnetType
}: BtcTransferVirtualTxParams): Promise<BtcTransferVirtualTxResult>
```

## RGB++ xUDT Leap from BTC to CKB

The method `genBtcJumpCkbVirtualTx` can generate a CKB virtual transaction which contains the necessary `inputCells/outputCells` for RGB++ xUDT leaping from BTC to CKB and the commitment to be inserted to the BTC tx OP_RETURN.

```TypeScript
interface BtcJumpCkbVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: Hex;
}
/**
 * Generate the virtual ckb transaction for the jumping tx from BTC to CKB
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred
 * @param witnessLockPlaceholderSize(Optional) The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate(Optional) The CKB transaction fee rate, default value is 1100
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const genBtcJumpCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  transferAmount,
  toCkbAddress,
  witnessLockPlaceholderSize,
  ckbFeeRate,
  btcTestnetType
}: BtcJumpCkbVirtualTxParams): Promise<BtcJumpCkbVirtualTxResult>
```

## RGB++ xUDT Leap from CKB to BTC

The method `genCkbJumpBtcVirtualTx` can generate a CKB transaction for RGB++ xUDT leaping from CKB to BTC

```TypeScript
/**
 * Generate the virtual ckb transaction for the jumping tx from CKB to BTC
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param fromCkbAddress The from ckb address who will use his private key to sign the ckb tx
 * @param toRgbppLockArgs The receiver rgbpp lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred
 * @param witnessLockPlaceholderSize(Optional) The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate(Optional) The CKB transaction fee rate, default value is 1100
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const genCkbJumpBtcVirtualTx = async ({
  collector,
  xudtTypeBytes,
  fromCkbAddress,
  toRgbppLockArgs,
  transferAmount,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: CkbJumpBtcVirtualTxParams): Promise<CKBComponents.RawTransaction>
```

## RGB++ Spore Creation on BTC

The method `genCreateSporeCkbVirtualTx` can generate a CKB virtual transaction which contains the necessary `inputCells/outputCells` for RGB++ Spore creation and the commitment to be inserted to the BTC tx OP_RETURN.

```TypeScript
export interface SporeCreateVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: Hex;
  // The cluster cell from ckb-indexer
  clusterCell: IndexerCell;
}

/**
 * Generate the virtual ckb transaction for creating spores
 * @param collector The collector that collects CKB live cells and transactions
 * @param clusterRgbppLockArgs The cluster rgbpp cell lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param sporeDataList The spore's data list, including name and description.
 * @param isMainnet True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet(see btcTestnetType for details about BTC Testnet)
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const genCreateSporeCkbVirtualTx = async ({
  collector,
  clusterRgbppLockArgs,
  sporeDataList,
  isMainnet,
  btcTestnetType
}: CreateSporeCkbVirtualTxParams): Promise<SporeCreateVirtualTxResult>
```

## RGB++ Spore Transfer on BTC

The method `genTransferSporeCkbVirtualTx` can generate a CKB virtual transaction which contains the necessary `inputCells/outputCells` for RGB++ Spore creation and the commitment to be inserted to the BTC tx OP_RETURN.

```TypeScript
export interface SporeTransferVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The spore cell from ckb-indexer
  sporeCell: IndexerCell;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: Hex;
}

/**
 * Generate the virtual ckb transaction for transferring spore
 * @param collector The collector that collects CKB live cells and transactions
 * @param sporeRgbppLockArgs The spore rgbpp cell lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param sporeTypeBytes The spore type script serialized bytes
 * @param isMainnet True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet(see btcTestnetType for details about BTC Testnet)
 * @param witnessLockPlaceholderSize(Optional) The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate(Optional) The CKB transaction fee rate, default value is 1100
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const genTransferSporeCkbVirtualTx = async ({
  collector,
  sporeRgbppLockArgs,
  sporeTypeBytes,
  isMainnet,
  witnessLockPlaceholderSize,
  ckbFeeRate,
  btcTestnetType
}: TransferSporeCkbVirtualTxParams): Promise<SporeTransferVirtualTxResult>
```

## RGB++ Spore Leap from BTC to CKB

The method `genBtcJumpCkbVirtualTx` can generate a CKB virtual transaction which contains the necessary `inputCells/outputCells` for RGB++ Spore leaping from BTC to CKB and the commitment to be inserted to the BTC tx OP_RETURN.

```TypeScript
export interface SporeLeapVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The spore cell from ckb-indexer
  sporeCell: IndexerCell;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: Hex;
}

/**
 * Generate the virtual ckb transaction for leaping spore from BTC to CKB
 * @param collector The collector that collects CKB live cells and transactions
 * @param sporeRgbppLockArgs The spore rgbpp cell lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param sporeTypeBytes The spore type script serialized bytes
 * @param toCkbAddress The receiver ckb address
 * @param isMainnet True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet(see btcTestnetType for details about BTC Testnet)
 * @param witnessLockPlaceholderSize(Optional) The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate(Optional) The CKB transaction fee rate, default value is 1100
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const genLeapSporeFromBtcToCkbVirtualTx = async ({
  collector,
  sporeRgbppLockArgs,
  sporeTypeBytes,
  toCkbAddress,
  isMainnet,
  witnessLockPlaceholderSize,
  ckbFeeRate,
  btcTestnetType
}: LeapSporeFromBtcToCkbVirtualTxParams): Promise<SporeLeapVirtualTxResult>
```

## RGB++ Spore Leap from CKB to BTC

The method `genLeapSporeFromCkbToBtcRawTx` can generate a CKB transaction for RGB++ Spore leaping from CKB to BTC

```TypeScript
/**
 * Generate the virtual ckb transaction for leaping spore from CKB to BTC
 * @param collector The collector that collects CKB live cells and transactions
 * @param sporeRgbppLockArgs The spore rgbpp cell lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param sporeTypeBytes The spore type script serialized bytes
 * @param toCkbAddress The receiver ckb address
 * @param isMainnet True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet
 * @param witnessLockPlaceholderSize(Optional) The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate(Optional) The CKB transaction fee rate, default value is 1100
 * @param btcTestnetType(Optional) The Bitcoin Testnet type including Testnet3 and Signet
 */
export const genLeapSporeFromCkbToBtcRawTx = async ({
  collector,
  sporeTypeBytes,
  fromCkbAddress,
  toRgbppLockArgs,
  isMainnet,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: LeapSporeFromCkbToBtcVirtualTxParams): Promise<CKBComponents.RawTransaction>
```
