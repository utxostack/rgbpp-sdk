export enum ErrorCodes {
  UNKNOWN,
  INSUFFICIENT_UTXO,
  UNSUPPORTED_ADDRESS_TYPE,
}

export const ErrorMessages = {
  [ErrorCodes.UNKNOWN]: 'Unknown error',
  [ErrorCodes.INSUFFICIENT_UTXO]: 'Insufficient UTXO',
  [ErrorCodes.UNSUPPORTED_ADDRESS_TYPE]: 'Unsupported address type',
};

export class TxBuildError extends Error {
  public code = ErrorCodes.UNKNOWN;
  constructor(code: ErrorCodes, message = ErrorMessages[code] || 'Unknown error') {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, TxBuildError.prototype);
  }
}
