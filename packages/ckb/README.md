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
