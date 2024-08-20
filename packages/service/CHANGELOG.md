# @rgbpp-sdk/service

## 0.6.0

### Minor Changes

- [#281](https://github.com/ckb-cell/rgbpp-sdk/pull/281): Upgrade ckb-sdk-js to fix esm and commonjs issues ([@duanyytop](https://github.com/duanyytop))

- [#246](https://github.com/ckb-cell/rgbpp-sdk/pull/246): Export ESM packages ([@duanyytop](https://github.com/duanyytop))

## v0.5.0

### Minor Changes

- [#248](https://github.com/ckb-cell/rgbpp-sdk/pull/248): Add `type_script` to the response of `/rgbpp/v1/address/{btc_address}/balance` API, and add `typeHash` to the response of rgbpp assets-related APIs ([@ShookLyngs](https://github.com/ShookLyngs))

## v0.4.0

### Minor Changes

- [#222](https://github.com/ckb-cell/rgbpp-sdk/pull/222): Add BtcAssetsApi.getRgbppApiBalanceByAddress() API for querying RGBPP XUDT balances by a BTC address ([@ShookLyngs](https://github.com/ShookLyngs))

## v0.3.0

### Minor Changes

- [#208](https://github.com/ckb-cell/rgbpp-sdk/pull/208): Adapt btc-assets-api#154, adding new props and return values to the /balance and /unspent APIs ([@ShookLyngs](https://github.com/ShookLyngs))

  - Add `available_satoshi` and `total_satoshi` to the BtcAssetsApi.getBtcBalance() API
  - Add `only_non_rgbpp_utxos` to the props of the BtcAssetsApi.getBtcUtxos() API
  - Remove `service.getRgbppAssetsByBtcUtxo()` lines from the DataCollector.collectSatoshi()
  - Remove `hasRgbppAssets` related variables/function from the DataCache

## v0.2.0

### Minor Changes

- [#165](https://github.com/ckb-cell/rgbpp-sdk/pull/165): Replace all "void 0" to "undefined" in the btc/service lib ([@ShookLyngs](https://github.com/ShookLyngs))

### Patch Changes

- [#181](https://github.com/ckb-cell/rgbpp-sdk/pull/181): add no_cache params to btc/rgbpp service api ([@ahonn](https://github.com/ahonn))

## v0.1.0

- Release @rgbpp-sdk/service for communicating with the [btc-assets-api](https://github.com/ckb-cell/btc-assets-api), providing APIs to query data from or post transactions to the service. Read the docs for more information: https://github.com/ckb-cell/rgbpp-sdk/tree/develop/packages/service
