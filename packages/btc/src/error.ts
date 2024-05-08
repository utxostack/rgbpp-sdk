export enum ErrorCodes {
  UNKNOWN,

  MISSING_PUBKEY = 20,
  CANNOT_FIND_UTXO,
  UNCONFIRMED_UTXO,
  INSUFFICIENT_UTXO,
  REFERENCED_UNPROVABLE_UTXO,
  UNSPENDABLE_OUTPUT,
  DUPLICATED_UTXO,
  DUST_OUTPUT,
  UNSUPPORTED_OUTPUT,
  UNSUPPORTED_NETWORK_TYPE,
  UNSUPPORTED_ADDRESS_TYPE,
  UNSUPPORTED_OP_RETURN_SCRIPT,
  INVALID_FEE_RATE,
  PAYMASTER_MISMATCH,

  CKB_CANNOT_FIND_OUTPOINT = 40,
  CKB_INVALID_CELL_LOCK,
  CKB_INVALID_INPUTS,
  CKB_INVALID_OUTPUTS,
  CKB_UNMATCHED_COMMITMENT,
  CKB_RGBPP_LOCK_UNPACK_ERROR,

  MEMPOOL_API_RESPONSE_ERROR = 60,
}

export const ErrorMessages = {
  [ErrorCodes.UNKNOWN]: 'Unknown error',

  [ErrorCodes.MISSING_PUBKEY]: 'Missing a pubkey that pairs with the address',
  [ErrorCodes.CANNOT_FIND_UTXO]: 'Cannot find the UTXO, it may not exist or is not live',
  [ErrorCodes.UNCONFIRMED_UTXO]: 'Unconfirmed UTXO',
  [ErrorCodes.INSUFFICIENT_UTXO]: 'Insufficient UTXO to construct the transaction',
  [ErrorCodes.REFERENCED_UNPROVABLE_UTXO]: 'Cannot reference a UTXO that does not belongs to "from"',
  [ErrorCodes.DUPLICATED_UTXO]: 'Cannot reference the same UTXO twice',
  [ErrorCodes.UNSPENDABLE_OUTPUT]: 'Target output is not an UTXO',
  [ErrorCodes.DUST_OUTPUT]: 'Output defined value is below the dust limit',
  [ErrorCodes.UNSUPPORTED_OUTPUT]: 'Unsupported output format',
  [ErrorCodes.UNSUPPORTED_NETWORK_TYPE]: 'Unsupported network type',
  [ErrorCodes.UNSUPPORTED_ADDRESS_TYPE]: 'Unsupported address type',
  [ErrorCodes.UNSUPPORTED_OP_RETURN_SCRIPT]: 'Unsupported OP_RETURN script format',
  [ErrorCodes.INVALID_FEE_RATE]: 'Invalid fee rate provided or recommended',
  [ErrorCodes.PAYMASTER_MISMATCH]: 'Paymaster mismatched',

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

  static withComment(code: ErrorCodes, comment?: string): TxBuildError {
    const message: string | undefined = ErrorMessages[code];
    return new TxBuildError(code, comment ? `${message}: ${comment}` : message);
  }
}
