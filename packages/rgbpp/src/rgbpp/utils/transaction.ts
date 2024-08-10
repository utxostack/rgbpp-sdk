import { BaseCkbVirtualTxResult } from '@rgbpp-sdk/ckb';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

export interface RgbppTxGroup {
  ckbVirtualTxResult: BaseCkbVirtualTxResult | string;
  btcTxHex: string;
}

export interface SentRgbppTxGroup {
  btc: {
    txId?: string;
    error?: Error | unknown;
  };
  ckb: {
    error?: Error | unknown;
  };
}

export async function sendRgbppTxGroups(props: {
  txGroups: RgbppTxGroup[];
  btcService: BtcAssetsApi;
}): Promise<SentRgbppTxGroup[]> {
  const results: SentRgbppTxGroup[] = [];
  for (const group of props.txGroups) {
    const result: SentRgbppTxGroup = {
      ckb: {},
      btc: {},
    };
    try {
      const sent = await props.btcService.sendBtcTransaction(group.btcTxHex);
      result.btc.txId = sent.txid;
    } catch (e) {
      result.btc.error = e;
    }
    try {
      await props.btcService.sendRgbppCkbTransaction({
        btc_txid: result.btc.txId!,
        ckb_virtual_result: group.ckbVirtualTxResult,
      });
    } catch (e) {
      result.ckb.error = e;
    }
    results.push(result);
  }

  return results;
}
