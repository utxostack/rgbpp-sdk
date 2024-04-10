import {
  Cell,
  QueryOptions,
  Script,
  CellCollector,
  CellProvider,
} from '@ckb-lumos/base';
import { bytes } from '@ckb-lumos/codec';
import { FromInfo, LockScriptInfo, parseFromInfo } from '@ckb-lumos/common-scripts';
import { Config, getConfig } from '@ckb-lumos/config-manager';
import { getRgbppLockScript } from '@rgbpp-sdk/ckb';

export class RgbppCellCollector {
  readonly fromScript: Script;
  private readonly cellCollector: CellCollector;

  constructor(
    private fromInfo: FromInfo,
    cellProvider: CellProvider,
    { queryOptions = {}, config = getConfig() }: { queryOptions?: QueryOptions; config?: Config },
  ) {
    if (!cellProvider) {
      throw new Error(`cellProvider is required when collecting Rgbpp-related cells`);
    }

    if (typeof fromInfo !== 'string') {
      throw new Error(`Only the address FromInfo is supported`);
    }

    const { fromScript } = parseFromInfo(fromInfo, { config });
    this.fromScript = fromScript;

    queryOptions = {
      ...queryOptions,
      lock: this.fromScript,
      type: queryOptions.type || 'empty',
      data: queryOptions.data || '0x',
    };

    this.cellCollector = cellProvider.collector(queryOptions);
  }

  async *collect(): AsyncGenerator<Cell> {
    const rgbppMainnetCodeHash = getRgbppLockScript(true).codeHash;
    const rgbppTestnetCodeHash = getRgbppLockScript(false).codeHash;
    if (
      !bytes.equal(this.fromScript.codeHash, rgbppMainnetCodeHash) &&
      !bytes.equal(this.fromScript.codeHash, rgbppTestnetCodeHash)
    ) {
      return;
    }

    for await (const inputCell of this.cellCollector.collect()) {
      yield inputCell;
    }
  }
}


/**
 * create a RGB++ ScriptInfo to register it to common-scripts
 */
export function createRgbppScriptInfo(isMainnet: boolean): LockScriptInfo {
  const rgbppLockScriptTemplate = getRgbppLockScript(isMainnet);

  return {
    codeHash: rgbppLockScriptTemplate.codeHash,
    hashType: 'type',
    lockScriptInfo: {
      CellCollector: RgbppCellCollector,
      prepareSigningEntries: () => {
        throw new Error(
          "RGB++ doesn't support prepareSigningEntries, please do not mix RGB++ locks with other locks in a transaction",
        );
      },
      async setupInputCell(txSkeleton, inputCell, _, options = {}) {
        const fromScript = inputCell.cellOutput.lock;
        asserts(
          bytes.equal(fromScript.codeHash, rgbppLockScriptTemplate.codeHash),
          `The input script is not RGB++ script`,
        );
        // add inputCell to txSkeleton
        txSkeleton = txSkeleton.update('inputs', (inputs) => inputs.push(inputCell));

        const output: Cell = {
          cellOutput: {
            capacity: inputCell.cellOutput.capacity,
            lock: inputCell.cellOutput.lock,
            type: inputCell.cellOutput.type,
          },
          data: inputCell.data,
        };

        txSkeleton = txSkeleton.update('outputs', (outputs) => outputs.push(output));

        const since = options.since;
        if (since) {
          txSkeleton = txSkeleton.update('inputSinces', (inputSinces) => {
            return inputSinces.set(txSkeleton.get('inputs').size - 1, since);
          });
        }

        txSkeleton = txSkeleton.update('witnesses', (witnesses) => witnesses.push('0x'));

        return txSkeleton;
      },
    },
  };
}

function asserts(condition: unknown, message = 'Assert failed'): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
