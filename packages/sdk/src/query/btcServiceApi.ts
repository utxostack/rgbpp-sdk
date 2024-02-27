export interface BtcServiceApiRequestOptions extends RequestInit {
  params?: Record<string, any>;
  method?: 'GET' | 'POST';
  requireToken?: boolean;
}

interface BtcServiceApiBalance {
  address: string;
  satoshi: number;
  utxoCount: number;
  pendingSatoshi: number;
}

interface BtcServiceApiToken {
  token: string;
}

export interface BtcServiceApiUtxo {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
}

export interface BtcServiceApiTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: {
    txid: string;
    vout: number;
    prevout: {
      scriptpubkey: string;
      scriptpubkey_asm: string;
      scriptpubkey_type: string;
      scriptpubkey_address: string;
      value: number;
    };
    scriptsig: string;
    scriptsig_asm: string;
    witness: string[];
    is_coinbase: boolean;
    sequence: number;
  }[];
  vout: {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number;
  }[];
  weight: number;
  size: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
}

export class BtcServiceApi {
  public url: string;
  public app: string;
  public domain: string;
  private token?: string;

  constructor(url: string, app: string, domain: string) {
    this.url = url;
    this.app = app;
    this.domain = domain;
  }

  async request<T>(route: string, options?: BtcServiceApiRequestOptions): Promise<T> {
    const { requireToken = true, method = 'GET', headers, params, ...otherOptions } = options ?? {};

    if (requireToken && !this.token) {
      await this._updateToken();
    }

    const packedParams = params ? '?' + new URLSearchParams(params).toString() : '';
    const withAuthHeaders = requireToken && this.token ? { Authorization: `Bearer ${this.token}` } : void 0;

    const res = await fetch(`${this.url}/${route}${packedParams}`, {
      method,
      headers: {
        ...withAuthHeaders,
        ...headers,
      },
      ...otherOptions,
    });

    return await res.json();
  }

  generateToken() {
    return this.request<BtcServiceApiToken>('/token/generate', {
      method: 'POST',
      requireToken: false,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app: this.app,
        domain: this.domain,
      }),
    });
  }

  async _updateToken() {
    const token = await this.generateToken();
    this.token = token.token;
  }

  getBalance(address: string) {
    return this.request<BtcServiceApiBalance>(`/bitcoin/v1/address/${address}/balance`, {
      requireToken: false,
    });
  }

  getUtxos(address: string) {
    return this.request<BtcServiceApiUtxo[]>(`/bitcoin/v1/address/${address}/unspent`);
  }

  getTransactions(address: string) {
    return this.request<BtcServiceApiTransaction[]>(`/bitcoin/v1/address/${address}/txs`);
  }

  getTransaction(txId: string) {
    return this.request<BtcServiceApiTransaction>(`/bitcoin/v1/transaction/${txId}`);
  }

  sendTransaction(txHex: string) {
    return this.request<BtcServiceApiToken>('/bitcoin/v1/transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        txHex,
      }),
    });
  }
}
