# @rgbpp-sdk/ckb

RGB++ SDK

## Installation

```
$ npm i @rgbpp-sdk/ckb@snap
# or
$ yarn add @rgbpp-sdk/ckb@snap
# or
$ pnpm add @rgbpp-sdk/ckb@snap
```

## Split paymaster cells

The `example/paymaster.ts` demonstrates how to use `@rgbpp-sdk/ckb` SDK to split multiple cells and you can set the parameters as blow:

- `receiverAddress`: The receiver ckb address
- `capacityWithCKB`: The capacity(unit is CKB) of each cell, for example: 316CKB
- `cellAmount`: The amount of cells to be split

```bash
cd packages/ckb && pnpm splitCells
```

## RGB++ assets transfer on BTC

The method `genBtcTransferCkbVirtualTx` can generate a CKB virtual transaction which contains the necessary `inputCells/outputCells` for rgbpp asset transfer and the commitment to be inserted to the BTC tx OP_RETURN.

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
 * @param isMainnet
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param noMergeOutputCells The noMergeOutputCells indicates whether the CKB outputs need to be merged. By default, the outputs will be merged.
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
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
}: BtcTransferVirtualTxParams): Promise<BtcTransferVirtualTxResult>
```

## RGB++ assets jump from BTC to CKB

The method `genBtcJumpCkbVirtualTx` can generate a CKB virtual transaction which contains the necessary `inputCells/outputCells` for rgbpp asset jumping from BTC to CKB and the commitment to be inserted to the BTC tx OP_RETURN.

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
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 * @param isMainnet
 */
export const genBtcJumpCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  transferAmount,
  toCkbAddress,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: BtcJumpCkbVirtualTxParams): Promise<BtcJumpCkbVirtualTxResult>
```

## RGB++ assets jump from CKB to BTC

The method `genCkbJumpBtcVirtualTx` can generate a CKB transaction for rgbpp assets jumping from CKB to BTC

```TypeScript
/**
 * Generate the virtual ckb transaction for the jumping tx from CKB to BTC
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param fromCkbAddress The from ckb address who will use his private key to sign the ckb tx
 * @param toRgbppLockArgs The receiver rgbpp lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 * @param isMainnet
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
