export enum RgbppErrorCodes {
  UNKNOWN,

  UNEXPECTED_CKB_VTX_OUTPUTS_LENGTH = 20,
}

export const RgbppErrorMessages = {
  [RgbppErrorCodes.UNKNOWN]: 'Unknown error',

  [RgbppErrorCodes.UNEXPECTED_CKB_VTX_OUTPUTS_LENGTH]: 'Unexpected length of the CkbVirtualTx outputs',
};

export class RgbppError extends Error {
  public code = RgbppErrorCodes.UNKNOWN;
  constructor(code: RgbppErrorCodes, message = RgbppErrorMessages[code] || 'Unknown error') {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, RgbppError.prototype);
  }

  static withComment(code: RgbppErrorCodes, comment?: string): RgbppError {
    const message: string | undefined = RgbppErrorMessages[code];
    return new RgbppError(code, comment ? `${message}: ${comment}` : message);
  }
}
