export interface UniSatOpenApiRequestOptions {
  params?: Record<string, any>;
}

export interface UniSatOpenApiResponse<T> {
  data: T;
  msg: string;
  code: number;
}

interface UniSatApiBalance {
  address: string;
  satoshi: number;
  pendingSatoshi: number;
  utxoCount: number;
  btcSatoshi: number;
  btcPendingSatoshi: number;
  btcUtxoCount: number;
  inscriptionSatoshi: number;
  inscriptionPendingSatoshi: number;
  inscriptionUtxoCount: number;
}

export interface UniSatApiUtxoList {
  cursor: 0,
  total: 1,
  totalConfirmed: 1,
  totalUnconfirmed: 0,
  totalUnconfirmedSpend: 0,
  utxo: UniSatApiUtxo[];
}
export interface UniSatApiUtxo {
  txid: string;
  vout: number;
  satoshi: number;
  scriptType: string;
  scriptPk: string;
  codeType: number;
  address: string;
  height: number;
  idx: number;
  isOpInRBF: boolean;
  isSpent: boolean;
  inscriptions: [];
}

export class UniSatOpenApi {
  public apiUrl: string;
  private readonly apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async request<T, R extends UniSatOpenApiResponse<T> = UniSatOpenApiResponse<T>>(
    route: string,
    options?: UniSatOpenApiRequestOptions
  ): Promise<R> {
    const params = options?.params ? '?' + new URLSearchParams(options.params).toString() : '';
    const res = await fetch(`${this.apiUrl}/${route}${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    return await res.json();
  }

  getBalance(address: string) {
    return this.request<UniSatApiBalance>(`/v1/indexer/address/${address}/balance`);
  }

  getUtxos(address: string, cursor?: number, size?: number) {
    return this.request<UniSatApiUtxoList>(`/v1/indexer/address/${address}/utxo-data`, {
      params: {
        cursor: cursor ?? 0,
        size: size ?? 50,
      },
    });
  }
}
