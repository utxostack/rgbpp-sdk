# rgbpp

## 0.6.0

### Minor Changes

- [#281](https://github.com/ckb-cell/rgbpp-sdk/pull/281): Upgrade ckb-sdk-js to fix esm and commonjs issues ([@duanyytop](https://github.com/duanyytop))

- [#246](https://github.com/ckb-cell/rgbpp-sdk/pull/246): Export ESM packages ([@duanyytop](https://github.com/duanyytop))

- [#283](https://github.com/ckb-cell/rgbpp-sdk/pull/283): Update response of sending RGB++ group txs ([@duanyytop](https://github.com/duanyytop))

- [#270](https://github.com/ckb-cell/rgbpp-sdk/pull/270): Support for batch transferring of RGBPP XUDT assets ([@ShookLyngs](https://github.com/ShookLyngs))

  - Add `buildRgbppTransferAllTxs()` API in the rgbpp lib for generating one or more BTC/CKB transaction groups for transferring the entire amount of a specific type of RGBPP XUDT asset from one or more BTC addresses to a recipient
  - Add `sendRgbppTxGroups()` API in the rgbpp lib for sending BTC/CKB transaction groups to the `BtcAssetsApi`
  - Add `unpackRgbppLockArgs()` API in the ckb lib for unpacking the lock script args of an RGBPP Cell
  - Add `encodeCellId()` and `decodeCellId()` APIs in the ckb lib for handling the ID of a CKB Cell
  - Add `encodeUtxoId()` and `decodeUtxoId()` APIs in the btc lib for handling the ID of a BTC UTXO

### Patch Changes

- [#275](https://github.com/ckb-cell/rgbpp-sdk/pull/275): Calculate XUDT amount separately in AssetSummarizer ([@ShookLyngs](https://github.com/ShookLyngs))

- Updated dependencies [[`82d37ab`](https://github.com/ckb-cell/rgbpp-sdk/commit/82d37ab56fc2c2c1dd0437f44966380bae6c9b42), [`a2722c5`](https://github.com/ckb-cell/rgbpp-sdk/commit/a2722c535efa04c9a9a8147228c82957fe33143d), [`a9a787d`](https://github.com/ckb-cell/rgbpp-sdk/commit/a9a787d059950b5e8d3641688680e31e3635f35a), [`a31a376`](https://github.com/ckb-cell/rgbpp-sdk/commit/a31a3761056754fb6624ff571736cf18ccbdcd98), [`ec2a38e`](https://github.com/ckb-cell/rgbpp-sdk/commit/ec2a38ec5858380b2ca34de596d1eb98d1db4611)]:
  - @rgbpp-sdk/btc@0.6.0
  - @rgbpp-sdk/ckb@0.6.0
  - @rgbpp-sdk/service@0.6.0

## v0.5.0

### Patch Changes

- Updated dependencies [[`9afc2a9`](https://github.com/ckb-cell/rgbpp-sdk/commit/9afc2a911e6a4ba8a200755b01159b5b149e4010), [`8f99429`](https://github.com/ckb-cell/rgbpp-sdk/commit/8f99429de45899e5169771e87e73603318a49ae8), [`475b3c3`](https://github.com/ckb-cell/rgbpp-sdk/commit/475b3c35ab1a25ba3aae28123f2820460101c889), [`1a8bb1c`](https://github.com/ckb-cell/rgbpp-sdk/commit/1a8bb1c8c305ddaba80e139a0730c9c76f8c7784)]:
  - @rgbpp-sdk/ckb@0.5.0
  - @rgbpp-sdk/btc@0.5.0
  - @rgbpp-sdk/service@0.5.0

## v0.4.0

### Minor Changes

- [#216](https://github.com/ckb-cell/rgbpp-sdk/pull/216): Export buildRgbppTransferTx from rgbpp package ([@duanyytop](https://github.com/duanyytop))

### Patch Changes

- Updated dependencies [[`1ecac34`](https://github.com/ckb-cell/rgbpp-sdk/commit/1ecac341d5ced04e59bfdcd432a9bce84bedd959), [`e5f41fd`](https://github.com/ckb-cell/rgbpp-sdk/commit/e5f41fd2b275182d2ab3fdf17e3b8853025fd2b9), [`08200c9`](https://github.com/ckb-cell/rgbpp-sdk/commit/08200c974ef336661723cc7556a003932babda9a), [`6e840c1`](https://github.com/ckb-cell/rgbpp-sdk/commit/6e840c196fbece06430c559aebbdadaf7fb6e632)]:
  - @rgbpp-sdk/btc@0.4.0
  - @rgbpp-sdk/service@0.4.0
  - @rgbpp-sdk/ckb@0.4.0

## v0.3.0

### Patch Changes

- Updated dependencies [[`d2d963c`](https://github.com/ckb-cell/rgbpp-sdk/commit/d2d963c8f40d0316491df5bdccca4eba7a33977c), [`4c77e69`](https://github.com/ckb-cell/rgbpp-sdk/commit/4c77e69cadc8ce3d24f631c1348dcd7141fb1099), [`3d41751`](https://github.com/ckb-cell/rgbpp-sdk/commit/3d417518c0224c6cd3cc3e55123cf4a691c0a976), [`4f05b1b`](https://github.com/ckb-cell/rgbpp-sdk/commit/4f05b1bba898b7acb58bdf20ae275164ad94523b), [`d0e62e2`](https://github.com/ckb-cell/rgbpp-sdk/commit/d0e62e2be8e21f02a84753cbc0f2200c8f88f155)]:
  - @rgbpp-sdk/ckb@0.3.0
  - @rgbpp-sdk/btc@0.3.0
  - @rgbpp-sdk/service@0.3.0

## v0.2.0

### Minor Changes

- [#157](https://github.com/ckb-cell/rgbpp-sdk/pull/157): Add rgbpp sub package ([@duanyytop](https://github.com/duanyytop))

### Patch Changes

- [#177](https://github.com/ckb-cell/rgbpp-sdk/pull/177): Fix the export of NetworkType/AddressType in the rgbpp lib ([@ShookLyngs](https://github.com/ShookLyngs))

- Updated dependencies [[`8a8e11b`](https://github.com/ckb-cell/rgbpp-sdk/commit/8a8e11bdca4d3fb8b8d20c771e116bb1684bb1c6), [`5e0e817`](https://github.com/ckb-cell/rgbpp-sdk/commit/5e0e8175a4c195e6491a37abedc755728c91cbed), [`a9b9796`](https://github.com/ckb-cell/rgbpp-sdk/commit/a9b9796f5ef8d27a9ad94d09a832bb9a7fe56c8e), [`9f9daa9`](https://github.com/ckb-cell/rgbpp-sdk/commit/9f9daa91486ca0cc1015713bd2648aa606da8717), [`299b404`](https://github.com/ckb-cell/rgbpp-sdk/commit/299b404217036feab409956d8888bfdc8fa820f4), [`e59322e`](https://github.com/ckb-cell/rgbpp-sdk/commit/e59322e7c6b9aff682bc1c8517337e3611dc122d), [`64c4312`](https://github.com/ckb-cell/rgbpp-sdk/commit/64c4312768885cb965285d41de99d023a4517ed3), [`d37cf5b`](https://github.com/ckb-cell/rgbpp-sdk/commit/d37cf5b1aaf50f42a2f900f9b6aa073a916840b2), [`1d58dd5`](https://github.com/ckb-cell/rgbpp-sdk/commit/1d58dd531947f4078667bb7294d2b3bb9351ead9), [`8cfc06e`](https://github.com/ckb-cell/rgbpp-sdk/commit/8cfc06e449c213868f103d9757f79f24521da280), [`4fcf4fa`](https://github.com/ckb-cell/rgbpp-sdk/commit/4fcf4fa6c0b20cf2fa957664a320f66601991817)]:
  - @rgbpp-sdk/btc@0.2.0
  - @rgbpp-sdk/ckb@0.2.0
  - @rgbpp-sdk/service@0.2.0
