---
'rgbpp': minor
---

Support for batch transferring of RGBPP XUDT assets

- Add `buildRgbppTransferAllTxs()` API to generate one or more BTC/CKB transaction groups for transferring the entire amount of a specific type of RGBPP XUDT asset from one or more BTC addresses to a recipient
- Add `sendRgbppTxGroups()` API for sending BTC/CKB transaction groups to the `BtcAssetsApi`
