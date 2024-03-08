# @rgbpp-sdk/btc

## 0.0.0-snap-20240308080935

### Patch Changes

- af1c82c: Support min_satoshi filter in the BtcAssetsApi
- de63180: Fix the syntax for importing the bitcoinjs-lib package
- 3ddf6b1: Support "minUtxoSatoshi" filter in the sentBtc() API
- 3a47d1f: Remove unnecessary "new" syntax when creating "BtcAssetsApi" instances
- 42b72ff: Require "app" and "domain" to be defined when requesting from the BtcAssetsApi
- b376000: Replace tiny-secp256k1 lib with @bitcoinerlab/secp256k1 for better js compatibility
- 05d20db: Remove "this.token" checks in the BtcAssetApi.generateToken() API, the API should only check whether "this.app" and "this.domain" exists.
- d31ac31: Improve readability of the ".env.example" file
- 923c6a8: Support origin check in the BtcAssetsApi
- ab42dfc: Rename the project to rgbpp-sdk
- cc8b9b8: Rename package folder "packages/sdk" to "packages/btc"
