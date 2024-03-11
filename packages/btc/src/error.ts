export enum ErrorCodes {
  UNKNOWN,
  MISSING_PUBKEY,
  INSUFFICIENT_UTXO,
  UNSUPPORTED_OUTPUT,
  UNSUPPORTED_ADDRESS_TYPE,
  INVALID_OP_RETURN_SCRIPT,
  ASSETS_API_RESPONSE_ERROR,
  ASSETS_API_UNAUTHORIZED,
  ASSETS_API_INVALID_PARAM,
  ASSETS_API_RESPONSE_DECODE_ERROR,
}

export const ErrorMessages = {
  [ErrorCodes.UNKNOWN]: 'Unknown error',
  [ErrorCodes.MISSING_PUBKEY]: 'Missing a pubkey corresponding to the UTXO',
  [ErrorCodes.INSUFFICIENT_UTXO]: 'Insufficient UTXO',
  [ErrorCodes.UNSUPPORTED_OUTPUT]: 'Unsupported output format',
  [ErrorCodes.UNSUPPORTED_ADDRESS_TYPE]: 'Unsupported address type',
  [ErrorCodes.INVALID_OP_RETURN_SCRIPT]: 'Invalid OP_RETURN script format',
  [ErrorCodes.ASSETS_API_UNAUTHORIZED]: 'BtcAssetsAPI unauthorized, please check your token/origin',
  [ErrorCodes.ASSETS_API_INVALID_PARAM]: 'Invalid param(s) was provided to the BtcAssetsAPI',
  [ErrorCodes.ASSETS_API_RESPONSE_ERROR]: 'BtcAssetsAPI returned an error',
  [ErrorCodes.ASSETS_API_RESPONSE_DECODE_ERROR]: 'Failed to decode the response of BtcAssetsAPI',
};

export class TxBuildError extends Error {
  public code = ErrorCodes.UNKNOWN;
  constructor(code: ErrorCodes, message = ErrorMessages[code] || 'Unknown error') {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, TxBuildError.prototype);
  }
}
