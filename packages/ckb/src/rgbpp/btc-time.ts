import { getBtcTimeLockDep, getBtcTimeLockScript, getXudtDep } from '../constants';
import { BtcTimeCellsParams } from '../types';
import { lockScriptFromBtcTimeLockArgs } from '../utils';

export const buildBtcTimeCellsTx = async ({
  collector,
  xudtType,
  cellCount,
  isMainnet,
}: BtcTimeCellsParams): Promise<CKBComponents.RawTransaction | null> => {
  const btcTimeLock = getBtcTimeLockScript(isMainnet);
  const btcTimeCells = await collector.getCells({ lock: btcTimeLock, type: xudtType });

  if (!btcTimeCells || btcTimeCells.length === 0) {
    return null;
  }
  const inputsCount = btcTimeCells.length > cellCount ? cellCount : btcTimeCells.length;

  const requiredBtcTimeCells = btcTimeCells.slice(0, inputsCount);
  const inputs: CKBComponents.CellInput[] = requiredBtcTimeCells.map((cell) => ({
    previousOutput: cell.outPoint,
    since: '0x0',
  }));

  const outputs: CKBComponents.CellOutput[] = requiredBtcTimeCells.map((cell) => ({
    lock: lockScriptFromBtcTimeLockArgs(cell.output.lock.args),
    type: cell.output.type,
    capacity: cell.output.capacity,
  }));

  const outputsData = requiredBtcTimeCells.map((cell) => cell.outputData);

  const cellDeps: CKBComponents.CellDep[] = [getBtcTimeLockDep(isMainnet), getXudtDep(isMainnet)];

  // TODO: Wait for btc time unlock witness
  const witnesses = inputs.map((_) => '0x');

  const ckbTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  return ckbTx;
};
