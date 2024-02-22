export enum ErrorCodes {
  UNKNOWN,
  INSUFFICIENT_BTC_UTXO,
  UNSUPPORTED_ADDRESS_TYPE,
}

export const ErrorMessages = {
  [ErrorCodes.UNKNOWN]: "Unknown error",
  [ErrorCodes.INSUFFICIENT_BTC_UTXO]: "Insufficient btc utxo",
  [ErrorCodes.UNSUPPORTED_ADDRESS_TYPE]: "Unsupported address type",
};

export class TxBuildError extends Error {
  public code = ErrorCodes.UNKNOWN;
  constructor(
    code: ErrorCodes,
    message = ErrorMessages[code] || "Unknown error"
  ) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, TxBuildError.prototype);
  }
}
