---
'@rgbpp-sdk/ckb': minor
---

Encapsulate 3 methods for supplementing CKB transaction fees:
- `appendOwnerCellToRgbppTx` for supplementing fees in RGB++ xUDT transactions;
- `completeBtcTimeCellSpentTx` for BTC timelock unlock transaction building and fee supplementation;
- `completeAppendingIssuerCellToSporesCreateTx` for supplementing fees in Spores creation transactions;

Encapsulate `signCkbTransaction` method for signing CKB transactions.