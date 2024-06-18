---
"@rgbpp-sdk/btc": minor
---

Support including multi-origin UTXOs in the same transaction

  - Add `pubkeyMap` option in the sendUtxos(), sendRgbppUtxos() and sendRbf() API
  - Rename `inputsPubkey` option to `pubkeyMap` in the sendRbf() API
  - Delete `onlyProvableUtxos` option from the sendRgbppUtxos() API
