---
"@rgbpp-sdk/btc": minor
"@rgbpp-sdk/ckb": minor
"rgbpp": minor
---

Support for batch transferring of RGBPP XUDT assets

  - Add `buildRgbppTransferAllTxs()` API in the rgbpp lib for generating one or more BTC/CKB transaction groups for transferring the entire amount of a specific type of RGBPP XUDT asset from one or more BTC addresses to a recipient
  - Add `sendRgbppTxGroups()` API in the rgbpp lib for sending BTC/CKB transaction groups to the `BtcAssetsApi`
  - Add `unpackRgbppLockArgs()` API in the ckb lib for unpacking the lock script args of an RGBPP Cell
  - Add `encodeCellId()` and `decodeCellId()` APIs in the ckb lib for handling the ID of a CKB Cell
  - Add `encodeUtxoId()` and `decodeUtxoId()` APIs in the btc lib for handling the ID of a BTC UTXO
