export class CapacityNotEnoughError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class IndexerError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class NoLiveCellError extends Error {
  constructor(message: string) {
    super(message);
  }
}
