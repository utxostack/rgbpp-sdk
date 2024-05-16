import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { btcService } from '../env';
export const network = 'testnet';
export async function getFastestFeeRate() {
  // const { service } = getDeployVariables();

  const fees = await btcService.getBtcRecommendedFeeRates();
  return Math.ceil(fees.fastestFee * 3);
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
  return JSON.parse(fs.readFileSync(file).toString());
}
