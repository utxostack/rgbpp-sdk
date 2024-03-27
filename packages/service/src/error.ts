export enum ErrorCodes {
  UNKNOWN,

  ASSETS_API_RESPONSE_ERROR,
  ASSETS_API_UNAUTHORIZED,
  ASSETS_API_INVALID_PARAM,
  ASSETS_API_RESOURCE_NOT_FOUND,
  ASSETS_API_RESPONSE_DECODE_ERROR,
}

export const ErrorMessages = {
  [ErrorCodes.UNKNOWN]: 'Unknown error',

  [ErrorCodes.ASSETS_API_UNAUTHORIZED]: 'BtcAssetsAPI unauthorized, please check your token/origin',
  [ErrorCodes.ASSETS_API_INVALID_PARAM]: 'Invalid param(s) was provided to the BtcAssetsAPI',
  [ErrorCodes.ASSETS_API_RESPONSE_ERROR]: 'BtcAssetsAPI returned an error',
  [ErrorCodes.ASSETS_API_RESOURCE_NOT_FOUND]: 'Resource not found on the BtcAssetsAPI',
  [ErrorCodes.ASSETS_API_RESPONSE_DECODE_ERROR]: 'Failed to decode the response of BtcAssetsAPI',
};

export class BtcAssetsApiError extends Error {
  public code = ErrorCodes.UNKNOWN;
  constructor(code: ErrorCodes, message = ErrorMessages[code] || 'Unknown error') {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, BtcAssetsApiError.prototype);
  }

  static withComment(code: ErrorCodes, comment?: string): BtcAssetsApiError {
    const message = ErrorMessages[code] || 'Unknown error';
    return new BtcAssetsApiError(code, comment ? `${message}: ${comment}` : message);
  }
}
