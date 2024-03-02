import { ErrorCodes, ErrorMessages, TxBuildError } from '../error';

export interface BtcAssetsApiRequestOptions extends RequestInit {
  params?: Record<string, any>;
  method?: 'GET' | 'POST';
  requireToken?: boolean;
}

interface BtcAssetsApiToken {
  token: string;
}

interface BtcAssetsApiBalance {
  address: string;
  satoshi: number;
  pending_satoshi: number;
  utxo_count: number;
}

export interface BtcAssetsApiUtxo {
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

export interface BtcAssetsApiSentTransaction {
  txid: string;
}

export interface BtcAssetsApiTransaction {
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

export class BtcAssetsApi {
  public url: string;
  public app?: string;
  public domain?: string;
  private token?: string;

  constructor(props: { url: string, app?: string, domain?: string, token?: string }) {
    this.url = props.url;

    // Optional
    this.app = props.app;
    this.domain = props.domain;
    this.token = props.token;
  }

  static fromToken(url: string, token: string) {
    return new BtcAssetsApi({ url, token });
  }

  static fromApp(url: string, app: string, domain: string) {
    return new BtcAssetsApi({ url, app, domain });
  }

  async init(force?: boolean) {
    // If the token exists and not a force action, do nothing
    if (this.token && !force) {
      return;
    }

    const token = await this.generateToken();
    this.token = token.token;
  }

  async request<T>(route: string, options?: BtcAssetsApiRequestOptions): Promise<T> {
    const { requireToken = true, method = 'GET', headers, params, ...otherOptions } = options ?? {};
    if (requireToken && !this.token && !(this.app && this.domain)) {
      throw new TxBuildError(ErrorCodes.ASSETS_API_REQUIRE_TOKEN);
    }
    if (requireToken && !this.token) {
      await this.init();
    }

    const packedParams = params ? '?' + new URLSearchParams(params).toString() : '';
    const withAuthHeaders = requireToken && this.token ? { Authorization: `Bearer ${this.token}` } : void 0;
    const res = await fetch(`${this.url}${route}${packedParams}`, {
      method,
      headers: {
        ...withAuthHeaders,
        ...headers,
      },
      ...otherOptions,
    } as RequestInit);

    let json: Record<string, any> | undefined;
    try {
      json = await res.json();
    } catch {
      throw new TxBuildError(ErrorCodes.ASSETS_API_RESPONSE_DECODE_ERROR);
    }

    if (json && json.ok === false) {
      console.error(json);
      throw new TxBuildError(
        ErrorCodes.ASSETS_API_RESPONSE_ERROR,
        `${ErrorMessages[ErrorCodes.ASSETS_API_RESPONSE_ERROR]}: ${json.message}`,
      );
    }

    return json! as T;
  }

  async post<T>(route: string, options?: BtcAssetsApiRequestOptions): Promise<T> {
    return this.request(route, {
      method: 'POST',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    } as BtcAssetsApiRequestOptions);
  }

  generateToken() {
    if (!this.app || !this.domain) {
      throw new TxBuildError(ErrorCodes.ASSETS_API_REQUIRE_APP_INFO);
    }

    return this.post<BtcAssetsApiToken>('/token/generate', {
      requireToken: false,
      body: JSON.stringify({
        app: this.app!,
        domain: this.domain!,
      }),
    });
  }

  getBalance(address: string) {
    return this.request<BtcAssetsApiBalance>(`/bitcoin/v1/address/${address}/balance`);
  }

  getUtxos(address: string) {
    return this.request<BtcAssetsApiUtxo[]>(`/bitcoin/v1/address/${address}/unspent`);
  }

  getTransactions(address: string) {
    return this.request<BtcAssetsApiTransaction[]>(`/bitcoin/v1/address/${address}/txs`);
  }

  getTransaction(txId: string) {
    return this.request<BtcAssetsApiTransaction>(`/bitcoin/v1/transaction/${txId}`);
  }

  sendTransaction(txHex: string) {
    return this.post<BtcAssetsApiSentTransaction>('/bitcoin/v1/transaction', {
      body: JSON.stringify({
        txHex,
      }),
    });
  }
}
