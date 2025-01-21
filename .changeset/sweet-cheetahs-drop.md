---
'@rgbpp-sdk/ckb': minor
---

Add USDI to compatible xUDT list and remove jsdelivr CDN because of cache 
  - Fetch and cache compatible xUDT list from Vercel or GitHub server
  - Use local static compatible xUDT list when the cache is empty
  - Remove jsdelivr CDN because CDN cache time is too long, causing UTXO Airdrop cellDeps to become outdated
