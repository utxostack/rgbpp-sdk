---
"@rgbpp-sdk/btc": patch
---

Remove "this.token" checks in the BtcAssetApi.generateToken() API, the API should only check whether "this.app" and "this.domain" exists.
