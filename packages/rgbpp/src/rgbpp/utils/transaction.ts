import { BaseCkbVirtualTxResult } from '@rgbpp-sdk/ckb';
import { BtcAssetsApi, BtcAssetsApiError } from '@rgbpp-sdk/service';

export interface RgbppTxGroup {
  ckbVirtualTxResult: BaseCkbVirtualTxResult | string;
  btcTxHex: string;
}

export interface SentRgbppTxGroup {
  btcTxId?: string;
  error?: string;
}

export async function sendRgbppTxGroups(props: {
  txGroups: RgbppTxGroup[];
  btcService: BtcAssetsApi;
}): Promise<SentRgbppTxGroup[]> {
  const results: SentRgbppTxGroup[] = [];
  for (const group of props.txGroups) {
    try {
      const { txid } = await props.btcService.sendBtcTransaction(group.btcTxHex);
      await props.btcService.sendRgbppCkbTransaction({
        btc_txid: txid,
        ckb_virtual_result: group.ckbVirtualTxResult,
      });
      results.push({ btcTxId: txid });
    } catch (e) {
      console.error(e);
      if (e instanceof BtcAssetsApiError) {
        results.push({ error: e.message });
      } else {
        results.push({ error: 'Sending the RGB++ group transactions failed' });
      }
    }
  }

  return results;
}
