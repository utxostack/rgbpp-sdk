export enum ErrorCodes {
  UNKNOWN,

  MISSING_PUBKEY,
  CANNOT_FIND_UTXO,
  INSUFFICIENT_UTXO,
  REFERENCED_UNPROVABLE_UTXO,
  UNSUPPORTED_OUTPUT,
  UNSUPPORTED_ADDRESS_TYPE,
  UNSUPPORTED_OP_RETURN_SCRIPT,
  INVALID_FEE_RATE,

  ASSETS_API_RESPONSE_ERROR,
  ASSETS_API_UNAUTHORIZED,
  ASSETS_API_INVALID_PARAM,
  ASSETS_API_RESPONSE_DECODE_ERROR,

  CKB_CANNOT_FIND_OUTPOINT,
  CKB_INVALID_CELL_LOCK,
  CKB_INVALID_INPUTS,
  CKB_INVALID_OUTPUTS,
  CKB_UNMATCHED_COMMITMENT,
  CKB_RGBPP_LOCK_UNPACK_ERROR,

  MEMPOOL_API_RESPONSE_ERROR,
}

export const ErrorMessages = {
  [ErrorCodes.UNKNOWN]: 'Unknown error',

  [ErrorCodes.MISSING_PUBKEY]: 'Missing a pubkey that pairs with the address',
  [ErrorCodes.CANNOT_FIND_UTXO]: 'Cannot find the UTXO, it may not exist or is not live',
  [ErrorCodes.INSUFFICIENT_UTXO]: 'Insufficient UTXO to cover the expected satoshi amount',
  [ErrorCodes.REFERENCED_UNPROVABLE_UTXO]: 'Cannot reference a UTXO that does not belongs to "from"',
  [ErrorCodes.UNSUPPORTED_OUTPUT]: 'Unsupported output format',
  [ErrorCodes.UNSUPPORTED_ADDRESS_TYPE]: 'Unsupported address type',
  [ErrorCodes.UNSUPPORTED_OP_RETURN_SCRIPT]: 'Unsupported OP_RETURN script format',
  [ErrorCodes.INVALID_FEE_RATE]: 'Invalid fee rate provided or recommended',

  [ErrorCodes.ASSETS_API_UNAUTHORIZED]: 'BtcAssetsAPI unauthorized, please check your token/origin',
  [ErrorCodes.ASSETS_API_INVALID_PARAM]: 'Invalid param(s) was provided to the BtcAssetsAPI',
  [ErrorCodes.ASSETS_API_RESPONSE_ERROR]: 'BtcAssetsAPI returned an error',
  [ErrorCodes.ASSETS_API_RESPONSE_DECODE_ERROR]: 'Failed to decode the response of BtcAssetsAPI',

  [ErrorCodes.CKB_CANNOT_FIND_OUTPOINT]: 'Cannot find CKB cell by OutPoint, it may not exist or is not live',
  [ErrorCodes.CKB_INVALID_CELL_LOCK]: 'Invalid CKB cell lock, it should be RgbppLock, RgbppTimeLock or null',
  [ErrorCodes.CKB_INVALID_INPUTS]: 'Invalid input(s) found in the CKB VirtualTx',
  [ErrorCodes.CKB_INVALID_OUTPUTS]: 'Invalid output(s) found in the CKB VirtualTx',
  [ErrorCodes.CKB_UNMATCHED_COMMITMENT]: 'Invalid commitment found in the CKB VirtualTx',
  [ErrorCodes.CKB_RGBPP_LOCK_UNPACK_ERROR]: 'Failed to unpack RgbppLockArgs from the CKB cell lock',

  [ErrorCodes.MEMPOOL_API_RESPONSE_ERROR]: 'Mempool.space API returned an error',
};

export class TxBuildError extends Error {
  public code = ErrorCodes.UNKNOWN;
  constructor(code: ErrorCodes, message = ErrorMessages[code] || 'Unknown error') {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, TxBuildError.prototype);
  }
}
