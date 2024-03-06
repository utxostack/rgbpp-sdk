import { Collector } from '../collector';
import { Address, Hex } from './common';

export interface ConstructParams {
  collector: Collector;
  masterPrivateKey: Hex;
  receiverAddress: Address;
  // The unit is CKB
  capacityWithCKB: number;
  cellAmount: number;
}
