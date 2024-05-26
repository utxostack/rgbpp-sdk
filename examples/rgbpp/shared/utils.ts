import * as fs from 'fs';
import * as path from 'path';
import {
  BaseCkbVirtualTxResult,
  SporeVirtualTxResult,
  SporeCreateVirtualTxResult,
  SporeTransferVirtualTxResult,
} from 'rgbpp/ckb';

/**
 * Save ckbVirtualTxResult to a log file
 * @param ckbVirtualTxResult - The ckbVirtualTxResult to save
 * @param exampleName - Example name used to distinguish different log files
 */

export type CkbVirtualTxResultType =
  | BaseCkbVirtualTxResult
  | SporeVirtualTxResult
  | SporeCreateVirtualTxResult
  | SporeTransferVirtualTxResult;

export const saveCkbVirtualTxResult = (ckbVirtualTxResult: CkbVirtualTxResultType, exampleName: string) => {
  try {
    // Define log file path
    const logDir = path.resolve(__dirname, '../logs');
    const timestamp = new Date().toISOString().replace(/:/g, '-'); // Replace colons with hyphens
    const logFilePath = path.join(logDir, `${exampleName}-${timestamp}-ckbVirtualTxResult.log`);

    // Ensure the log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    // Validate and save ckbVirtualTxResult to log file
    if (typeof ckbVirtualTxResult === 'object' && ckbVirtualTxResult !== null) {
      fs.writeFileSync(logFilePath, JSON.stringify(ckbVirtualTxResult, null, 2));
      console.info(`Saved ckbVirtualTxResult to ${logFilePath}`);
    } else {
      console.error('Invalid ckbVirtualTxResult format');
    }

    // Remind developers to save the transaction result
    console.info(
      `Important: It's recommended to save the rgbpp_ckb_tx_virtual locally before the isomorphic transactions are finalized.`,
    );
  } catch (error) {
    console.error('Failed to save ckbVirtualTxResult:', error);
  }
};
