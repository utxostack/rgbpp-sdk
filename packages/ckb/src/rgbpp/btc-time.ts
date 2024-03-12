import { getBtcTimeLockDep, getBtcTimeLockScript, getXudtDep } from '../constants';
import { BtcTimeCellsParams } from '../types';
import { lockScriptFromBtcTimeLockArgs } from '../utils';

/**
 * Collect btc time cells and spend them to create xudt cells for the specific lock scripts in the btc time lock args
 * The btc time lock args data structure is: lock_script | after | new_bitcoin_tx_id
 * @param btcTimeCells The btc time cells which have met the block confirmations and can be spent
 * @param isMainnet
 */
export const buildBtcTimeCellsSpentTx = async ({
  btcTimeCells,
  isMainnet,
}: BtcTimeCellsParams): Promise<CKBComponents.RawTransaction | null> => {
  const inputs: CKBComponents.CellInput[] = btcTimeCells.map((cell) => ({
    previousOutput: cell.outPoint,
    since: '0x0',
  }));

  const outputs: CKBComponents.CellOutput[] = btcTimeCells.map((cell) => ({
    lock: lockScriptFromBtcTimeLockArgs(cell.output.lock.args),
    type: cell.output.type,
    capacity: cell.output.capacity,
  }));

  const outputsData = btcTimeCells.map((cell) => cell.outputData);

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
