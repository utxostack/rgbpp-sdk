import { BaseCkbVirtualTxResult } from '@rgbpp-sdk/ckb';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

export interface RgbppTxGroup {
  ckbVirtualTxResult: BaseCkbVirtualTxResult | string;
  btcTxHex: string;
}

export interface SentRgbppTxGroup {
  btc: {
    sent: boolean;
    txId?: string;
    error?: Error | unknown;
  };
  ckb: {
    sent: boolean;
    error?: Error | unknown;
  };
}

export async function sendRgbppTxGroups(props: {
  txGroups: RgbppTxGroup[];
  btcService: BtcAssetsApi;
  retry?: number;
}): Promise<SentRgbppTxGroup[]> {
  const results: SentRgbppTxGroup[] = [];
  for (const group of props.txGroups) {
    const result: SentRgbppTxGroup = {
      ckb: {
        sent: false,
      },
      btc: {
        sent: false,
      },
    };
    try {
      // TODO: add retry logic
      const sent = await props.btcService.sendBtcTransaction(group.btcTxHex);
      result.btc.txId = sent.txid;
      result.btc.sent = true;
    } catch (e) {
      result.btc.sent = false;
      result.btc.error = e;
    }
    if (result.btc.sent) {
      try {
        await props.btcService.sendRgbppCkbTransaction({
          btc_txid: result.btc.txId!,
          ckb_virtual_result: group.ckbVirtualTxResult,
        });
        result.ckb.sent = true;
      } catch (e) {
        result.ckb.sent = false;
        result.ckb.error = e;
      }
    }
    results.push(result);
  }

  return results;
}
