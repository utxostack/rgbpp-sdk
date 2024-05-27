# @rgbpp-sdk/btc

## v0.2.0

### Minor Changes

- [#184](https://github.com/ckb-cell/rgbpp-sdk/pull/184): Support query data caching internally in TxBuilder/DataSource, preventing query from the BtcAssetsApi too often when paying fee ([@ShookLyngs](https://github.com/ShookLyngs))

- [#165](https://github.com/ckb-cell/rgbpp-sdk/pull/165): Replace all "void 0" to "undefined" in the btc/service lib ([@ShookLyngs](https://github.com/ShookLyngs))

### Patch Changes

- [#166](https://github.com/ckb-cell/rgbpp-sdk/pull/166): Fix the message of INSUFFICIENT_UTXO error when collection failed ([@ShookLyngs](https://github.com/ShookLyngs))

- Updated dependencies [[`5e0e817`](https://github.com/ckb-cell/rgbpp-sdk/commit/5e0e8175a4c195e6491a37abedc755728c91cbed), [`a9b9796`](https://github.com/ckb-cell/rgbpp-sdk/commit/a9b9796f5ef8d27a9ad94d09a832bb9a7fe56c8e), [`9f9daa9`](https://github.com/ckb-cell/rgbpp-sdk/commit/9f9daa91486ca0cc1015713bd2648aa606da8717), [`299b404`](https://github.com/ckb-cell/rgbpp-sdk/commit/299b404217036feab409956d8888bfdc8fa820f4), [`e59322e`](https://github.com/ckb-cell/rgbpp-sdk/commit/e59322e7c6b9aff682bc1c8517337e3611dc122d), [`64c4312`](https://github.com/ckb-cell/rgbpp-sdk/commit/64c4312768885cb965285d41de99d023a4517ed3), [`1d58dd5`](https://github.com/ckb-cell/rgbpp-sdk/commit/1d58dd531947f4078667bb7294d2b3bb9351ead9), [`8cfc06e`](https://github.com/ckb-cell/rgbpp-sdk/commit/8cfc06e449c213868f103d9757f79f24521da280), [`4fcf4fa`](https://github.com/ckb-cell/rgbpp-sdk/commit/4fcf4fa6c0b20cf2fa957664a320f66601991817)]:
  - @rgbpp-sdk/ckb@0.2.0
  - @rgbpp-sdk/service@0.2.0

## v0.1.0

- Release @rgbpp-sdk/btc for RGBPP BTC-side transaction construction, providing APIs to send BTC or send RGBPP UTXO. Read the docs for more information: https://github.com/ckb-cell/rgbpp-sdk/tree/develop/packages/btc
