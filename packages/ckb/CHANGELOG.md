# @rgbpp-sdk/ckb

## 0.6.0

### Minor Changes

- [#281](https://github.com/ckb-cell/rgbpp-sdk/pull/281): Upgrade ckb-sdk-js to fix esm and commonjs issues ([@duanyytop](https://github.com/duanyytop))

- [#246](https://github.com/ckb-cell/rgbpp-sdk/pull/246): Export ESM packages ([@duanyytop](https://github.com/duanyytop))

- [#270](https://github.com/ckb-cell/rgbpp-sdk/pull/270): Support for batch transferring of RGBPP XUDT assets ([@ShookLyngs](https://github.com/ShookLyngs))

  - Add `buildRgbppTransferAllTxs()` API in the rgbpp lib for generating one or more BTC/CKB transaction groups for transferring the entire amount of a specific type of RGBPP XUDT asset from one or more BTC addresses to a recipient
  - Add `sendRgbppTxGroups()` API in the rgbpp lib for sending BTC/CKB transaction groups to the `BtcAssetsApi`
  - Add `unpackRgbppLockArgs()` API in the ckb lib for unpacking the lock script args of an RGBPP Cell
  - Add `encodeCellId()` and `decodeCellId()` APIs in the ckb lib for handling the ID of a CKB Cell
  - Add `encodeUtxoId()` and `decodeUtxoId()` APIs in the btc lib for handling the ID of a BTC UTXO

### Patch Changes

- [#279](https://github.com/ckb-cell/rgbpp-sdk/pull/279): fix: Update molecule codegen, packing and unpacking ([@duanyytop](https://github.com/duanyytop))

  - Generate molecule code with latest lumos/molecule
  - Update RGB++ witness and BTC time lock args packing and unpacking

- Updated dependencies [[`82d37ab`](https://github.com/ckb-cell/rgbpp-sdk/commit/82d37ab56fc2c2c1dd0437f44966380bae6c9b42), [`a2722c5`](https://github.com/ckb-cell/rgbpp-sdk/commit/a2722c535efa04c9a9a8147228c82957fe33143d)]:
  - @rgbpp-sdk/service@0.6.0

## v0.5.0

### Minor Changes

- [#258](https://github.com/ckb-cell/rgbpp-sdk/pull/258): Support for arbitrary btc confirmation blocks to unlock btc time cells([@duanyytop](https://github.com/duanyytop))

- [#263](https://github.com/ckb-cell/rgbpp-sdk/pull/263): Remove 1CKB from BTC time cell capacity([@duanyytop](https://github.com/duanyytop))

### Patch Changes

- Updated dependencies [[`9afc2a9`](https://github.com/ckb-cell/rgbpp-sdk/commit/9afc2a911e6a4ba8a200755b01159b5b149e4010)]:
  - @rgbpp-sdk/service@0.5.0

## v0.4.0

### Minor Changes

- [#236](https://github.com/ckb-cell/rgbpp-sdk/pull/236): Fix typo and remove useless queue types ([@duanyytop](https://github.com/duanyytop))

### Patch Changes

- Updated dependencies [[`e5f41fd`](https://github.com/ckb-cell/rgbpp-sdk/commit/e5f41fd2b275182d2ab3fdf17e3b8853025fd2b9)]:
  - @rgbpp-sdk/service@0.4.0

## v0.3.0

### Minor Changes

- [#197](https://github.com/ckb-cell/rgbpp-sdk/pull/197): Return needPaymasterCell for RGB++ ckb cirtual tx ([@duanyytop](https://github.com/duanyytop))

- [#191](https://github.com/ckb-cell/rgbpp-sdk/pull/191): Dynamic fetching cell deps deployed by TypeID ([@duanyytop](https://github.com/duanyytop))

### Patch Changes

- [#212](https://github.com/ckb-cell/rgbpp-sdk/pull/212): Fix the XUDT cell data unpacking logic to load only the first 16 bytes ([@ShookLyngs](https://github.com/ShookLyngs))

- Updated dependencies [[`4f05b1b`](https://github.com/ckb-cell/rgbpp-sdk/commit/4f05b1bba898b7acb58bdf20ae275164ad94523b)]:
  - @rgbpp-sdk/service@0.3.0

## v0.2.0

### Minor Changes

- [#179](https://github.com/ckb-cell/rgbpp-sdk/pull/179): Increase the max length of RGB++ inputs to 40 ([@duanyytop](https://github.com/duanyytop))

- [#160](https://github.com/ckb-cell/rgbpp-sdk/pull/160): Collect all RGB++ inputs without isMax parameter ([@duanyytop](https://github.com/duanyytop))

- [#190](https://github.com/ckb-cell/rgbpp-sdk/pull/190): Filter xudt cell whose amount is valid for collector ([@duanyytop](https://github.com/duanyytop))

- [#172](https://github.com/ckb-cell/rgbpp-sdk/pull/172): Check spore type script for spore transfer and leap ([@duanyytop](https://github.com/duanyytop))

- [#171](https://github.com/ckb-cell/rgbpp-sdk/pull/171): Build ckb raw tx to be signed for spores creation ([@duanyytop](https://github.com/duanyytop))

- [#174](https://github.com/ckb-cell/rgbpp-sdk/pull/174): Update ckb cell fields size to make the code more readable ([@duanyytop](https://github.com/duanyytop))

- [#187](https://github.com/ckb-cell/rgbpp-sdk/pull/187): Update RRB++ witnesses for BTC batch transfer TX ([@duanyytop](https://github.com/duanyytop))

### Patch Changes

- Updated dependencies [[`9f9daa9`](https://github.com/ckb-cell/rgbpp-sdk/commit/9f9daa91486ca0cc1015713bd2648aa606da8717), [`e59322e`](https://github.com/ckb-cell/rgbpp-sdk/commit/e59322e7c6b9aff682bc1c8517337e3611dc122d)]:
  - @rgbpp-sdk/service@0.2.0

## v0.1.0

- Release @rgbpp-sdk/ckb for RGBPP CKB-side transaction construction, providing APIs to bind/transfer/leap assets on CKB/BTC. Read the docs for more information: https://github.com/ckb-cell/rgbpp-sdk/tree/develop/packages/ckb
