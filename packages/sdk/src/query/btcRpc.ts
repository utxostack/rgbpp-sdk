export interface RpcRequestBody {
  method: string;
  params: any[];
}

export interface RpcResponse<T> {
  result: T;
  id: number | null;
  error: string | null;
}

export class BtcRpc {
  public rpcUrl: string;
  private readonly rpcUser: string;

  constructor(rpcUrl: string, rpcUser: string) {
    this.rpcUrl = rpcUrl;
    this.rpcUser = btoa(rpcUser);
  }

  async request<T, R extends RpcResponse<T>>(body: RpcRequestBody): Promise<R> {
    const res = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + this.rpcUser,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return await res.json();
  }

  getBlockchainInfo() {
    return this.request({
      method: 'getblockchaininfo',
      params: [],
    });
  }

  sendRawTransaction(txHex: string) {
    return this.request({
      method: 'sendrawtransaction',
      params: [txHex],
    });
  }
}
