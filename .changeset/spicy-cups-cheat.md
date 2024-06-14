---
"@rgbpp-sdk/btc": minor
---

Support Full-RBF feature with the sendRbf() and createSendRbfBuilder() API

  - Add `excludeUtxos`, `skipInputsValidation` options in the `sendUtxos()` API to support the RBF feature
  - Add `onlyProvableUtxos` option in the `sendRgbppUtxos()` API for future update supports
  - Add `changeIndex` in the return type of the BTC Builder APIs
