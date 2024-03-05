export enum ErrorCodes {
  UNKNOWN,
  INSUFFICIENT_UTXO,
  UNSUPPORTED_ADDRESS_TYPE,
  ASSETS_API_RESPONSE_ERROR,
  ASSETS_API_UNAUTHORIZED,
  ASSETS_API_INVALID_PARAM,
  ASSETS_API_RESPONSE_DECODE_ERROR,
}

export const ErrorMessages = {
  [ErrorCodes.UNKNOWN]: 'Unknown error',
  [ErrorCodes.INSUFFICIENT_UTXO]: 'Insufficient UTXO',
  [ErrorCodes.UNSUPPORTED_ADDRESS_TYPE]: 'Unsupported address type',
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
