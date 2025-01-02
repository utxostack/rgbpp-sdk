---
'@rgbpp-sdk/service': minor
'rgbpp': minor
'@rgbpp-sdk/ckb': minor
---

Support compatible xUDT RGB++ assets

  - Fetch compatible xUDT `cellDeps` to build CKB transactions from the `typeid-contract-cell-deps` GitHub repository
  -  Update the `ckb` package to support RGB++ compatible xUDT assets leaping and transferring
  - Add optional parameter `compatibleXudtTypeScript` to the functions of the `rgbpp` package to transfer RGB++ compatible xUDT assets
  - Add RGB++ compatible xUDT assets leaping and transferring examples
  - Add RGB++ compatible xUDT assets integration tests
  - Add `assets/type` API to the service package
