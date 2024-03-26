---
"@rgbpp-sdk/btc": patch
---

Add and wrap mempool.space APIs, provides DataSource.getRecommendedFeeRates() and DataSource.getAverageFeeRate() APIs for fee rate recommendations. By default, the TxBuilder uses the "halfHourFee" rate from the mempool.space as the default fee rate.
