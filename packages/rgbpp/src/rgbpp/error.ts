export enum RgbppErrorCodes {
  UNKNOWN,

  CANNOT_DECODE_UTXO_ID = 20,
  UNEXPECTED_CKB_VTX_OUTPUTS_LENGTH,
}

export const RgbppErrorMessages = {
  [RgbppErrorCodes.UNKNOWN]: 'Unknown error',

  [RgbppErrorCodes.CANNOT_DECODE_UTXO_ID]: 'Cannot decode UtxoId',
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
