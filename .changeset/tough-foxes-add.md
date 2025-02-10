---
'@rgbpp-sdk/ckb': minor
---

Encapsulate 3 methods for supplementing CKB transaction fees:
- `appendIssuerCellToBtcBatchTransferToSign` for supplementing fees in RGB++ xUDT transactions;
- `prepareBtcTimeCellSpentUnsignedTx` for BTC timelock unlock transaction building and fee supplementation;
- `appendIssuerCellToSporesCreateUnsignedTx` for supplementing fees in Spores creation transactions;

Encapsulate `signCkbTransaction` method for signing CKB transactions.