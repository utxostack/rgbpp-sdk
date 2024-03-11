# @rgbpp-sdk/ckb

RGB++ SDK

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
- `capacityWithCKB`: The capacity(unit is CKB) of each cell, for example: 220CKB
- `cellAmount`: The amount of cells to be split

```bash
cd packages/ckb && pnpm splitCells
```

## BTC rgbpp asset transfer

The method `genBtcTransferCkbVirtualTx` can generate a CKB virtual transaction which contains the necessary `inputCells/outputCells` for rgbpp asset transfer and the commitment to be inserted to the BTC OP_RETURN.

```TypeScript
interface BtcTransferVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: bigint;
}

/**
 * Generate the virtual ckb transaction for the btc transfer tx
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred
 * @param isMainnet
 */
const genBtcTransferCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  transferAmount,
  isMainnet,
}: BtcTransferVirtualTxParams): Promise<BtcTransferVirtualTxResult>
```

## BTC rgbpp asset jump to CKB

The method `genBtcJumpCkbVirtualTx` can generate a CKB virtual transaction which contains the necessary `inputCells/outputCells` for rgbpp asset jumping from BTC to CKB and the commitment to be inserted to the BTC OP_RETURN.

```TypeScript
interface BtcJumpCkbVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: bigint;
}

/**
 * Generate the virtual ckb transaction for the jumping tx from BTC to CKB
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred
 * @param isMainnet
 */
export const genBtcJumpCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  transferAmount,
  toCkbAddress,
}: BtcJumpCkbVirtualTxParams): Promise<BtcJumpCkbVirtualTxResult>
```
