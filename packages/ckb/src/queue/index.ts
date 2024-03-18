import axios, { AxiosInstance } from 'axios';
import { AppendRgppTxRequest, AppendRgppTxResp, CheckRgppTxResp } from '../types/queue';
import { Hex } from '../types';

export class QueueApi {
  private axios: AxiosInstance;

  constructor(baseURL: string) {
    this.axios = axios.create({
      baseURL,
      timeout: 10 * 1000,
    });
  }

  appendRgpbbTxToQueue(request: AppendRgppTxRequest) {
    return this.axios.post<AppendRgppTxResp>(`/rgbpp/v1/transaction/ckb-tx`, request);
  }

  checkRgbppTxStatus(btcTxId: Hex) {
    return this.axios.get<CheckRgppTxResp>(`/rgbpp/v1/transaction/${btcTxId}`);
  }
}
