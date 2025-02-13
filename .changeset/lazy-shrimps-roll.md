---
'rgbpp': minor
'@rgbpp-sdk/ckb': minor
---

Add offline mode support for compatible xUDT type scripts:
- Introduce an optional `offline` boolean parameter to the following methods:
  - `isUDTTypeSupported`
  - `isCompatibleUDTTypesSupported`
  - `CompatibleXUDTRegistry.getCompatibleTokens`
- Add examples demonstrating compatible xUDT asset management in offline mode
