import { getBtcTimeLockDep, getBtcTimeLockScript, getXudtDep } from '../constants';
import { BtcTimeCellsParams } from '../types';
import { lockScriptFromBtcTimeLockArgs } from '../utils';

/**
 * Collect btc time cells and spend them to create xudt cells for the specific lock scripts in the btc time lock args
 * The btc time lock args data structure is: lock_script | after | new_bitcoin_tx_id
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtType The XUDT type script
 * @param cellCount The count of the btc time cells to be collected and spent
 * @param isMainnet
 */
export const buildBtcTimeCellsSpentTx = async ({
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
