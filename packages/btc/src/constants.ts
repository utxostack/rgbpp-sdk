/**
 * The minimum satoshi amount that can be declared in a BTC_UTXO.
 * BTC_UTXOs with satoshi below this constant are considered dust and will not be collected/created.
 * Officially, this constant should be 1,0000, but currently we are using 1,000 for testing purposes.
 */
export const BTC_UTXO_DUST_LIMIT = 1000;

/**
 * The minimum satoshi amount that can be declared in a RGBPP_UTXO.
 * RGBPP_UTXOs with satoshi below this constant are considered dust and will not be created.
 */
export const RGBPP_UTXO_DUST_LIMIT = 546;

/**
 * An empty placeholder, filled with 0s for the txid of the BTC transaction.
 */
export const BTC_TX_ID_PLACEHOLDER = '0x' + '0'.repeat(64);
