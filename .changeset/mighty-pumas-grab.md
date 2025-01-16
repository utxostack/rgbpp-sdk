---
'@rgbpp-sdk/service': minor
'@rgbpp-sdk/btc': minor
'@rgbpp-sdk/ckb': minor
---

Add `OfflineBtcAssetsDataSource` and `OfflineCollector` to offline build RGB++ transactions

- Add `OfflineBtcAssetsDataSource` to collect BTC UTXOs to build RGB++ BTC transactions offline
- Add `OfflineCollector` to collect CKB cells to build RGB++ CKB transactions offline
- Improved error handling for `OfflineBtcAssetsDataSource`
- Add examples for RGB++ assets offline launch, transfer, and leap
