enum ErrorCode {
  CapacityNotEnough = 100,
  IndexerRpcError = 101,
  NoLiveCell = 102,
  NoXudtLiveCell = 103,
  NoRgbppLiveCell = 104,
  UdtAmountNotEnough = 105,
  InputsCapacityNotEnough = 106,
  TypeAssetNotSupported = 107,
  InputsOrOutputsLenInvalid = 108,
  RgbppCkbTxInputsExceeded = 109,
  RgbppUtxoBindMultiSpores = 110,
  RgbppSporeTypeMismatch = 111,
}

export class CapacityNotEnoughError extends Error {
  code = ErrorCode.CapacityNotEnough;
  constructor(message: string) {
    super(message);
  }
}

export class IndexerError extends Error {
  code = ErrorCode.IndexerRpcError;
  constructor(message: string) {
    super(message);
  }
}

export class NoLiveCellError extends Error {
  code = ErrorCode.NoLiveCell;
  constructor(message: string) {
    super(message);
  }
}

export class NoXudtLiveCellError extends Error {
  code = ErrorCode.NoXudtLiveCell;
  constructor(message: string) {
    super(message);
  }
}

export class NoRgbppLiveCellError extends Error {
  code = ErrorCode.NoRgbppLiveCell;
  constructor(message: string) {
    super(message);
  }
}

export class UdtAmountNotEnoughError extends Error {
  code = ErrorCode.UdtAmountNotEnough;
  constructor(message: string) {
    super(message);
  }
}

export class InputsCapacityNotEnoughError extends Error {
  code = ErrorCode.InputsCapacityNotEnough;
  constructor(message: string) {
    super(message);
  }
}

export class TypeAssetNotSupportedError extends Error {
  code = ErrorCode.TypeAssetNotSupported;
  constructor(message: string) {
    super(message);
  }
}

export class InputsOrOutputsLenError extends Error {
  code = ErrorCode.InputsOrOutputsLenInvalid;
  constructor(message: string) {
    super(message);
  }
}

export class RgbppCkbTxInputsExceededError extends Error {
  code = ErrorCode.RgbppCkbTxInputsExceeded;
  constructor(message: string) {
    super(message);
  }
}

export class RgbppUtxoBindMultiSporesError extends Error {
  code = ErrorCode.RgbppUtxoBindMultiSpores;
  constructor(message: string) {
    super(message);
  }
}

export class RgbppSporeTypeMismatchError extends Error {
  code = ErrorCode.RgbppSporeTypeMismatch;
  constructor(message: string) {
    super(message);
  }
}
