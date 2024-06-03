---
"@rgbpp-sdk/service": minor
"@rgbpp-sdk/btc": minor
---

Adapt btc-assets-api#154, adding new props and return values to the /balance and /unspent APIs

- Add `available_satoshi` and `total_satoshi` to the BtcAssetsApi.getBtcBalance() API
- Add `only_non_rgbpp_utxos` to the props of the BtcAssetsApi.getBtcUtxos() API
- Remove `service.getRgbppAssetsByBtcUtxo()` lines from the DataCollector.collectSatoshi()
- Remove `hasRgbppAssets` related variables/function from the DataCache
