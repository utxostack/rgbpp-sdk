import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { btcService } from '../env';

export const network = 'testnet';

export async function getFastestFeeRate() {
  const fees = await btcService.getBtcRecommendedFeeRates();
  // return fees.fastestFee + 1000;
  return Math.ceil(fees.fastestFee * 1.1);
}

export async function writeStepLog(step: string, data: string | object) {
  const file = path.join(__dirname, `../${network}/step-${step}.log`);
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }

  fs.writeFileSync(file, data);
}

export function readStepLog(step: string) {
  const file = path.join(__dirname, `../${network}/step-${step}.log`);
  const retryInterval = 10000;
  const maxRetries = 3;

  for (let i = 0; i < 3; i++) {
    try {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to read file ${file} on attempt ${i + 1}: ${error}`);
      if (i < maxRetries - 1) {
        console.log(`Waiting ${retryInterval / 1000} seconds before retrying...`);
        setTimeout(() => {}, retryInterval);
      }
    }
  }

  console.error(`Failed to read file ${file} after ${maxRetries} attempts.`);
  return null;
}
