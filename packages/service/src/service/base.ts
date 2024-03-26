import { isDomain } from '../utils';
import { BtcAssetsApiError, ErrorCodes } from '../error';
import { BaseApis, BaseApiRequestOptions, BtcAssetsApiToken } from '../types';

export class BtcAssetsApiBase implements BaseApis {
  public url: string;
  public app?: string;
  public domain?: string;
  public origin?: string;
  private token?: string;

  constructor(props: { url: string; app?: string; domain?: string; origin?: string; token?: string }) {
    this.url = props.url;
    this.app = props.app;
    this.domain = props.domain;
    this.origin = props.origin;
    this.token = props.token;

    // Validation
    if (this.domain && !isDomain(this.domain, true)) {
      throw BtcAssetsApiError.withComment(ErrorCodes.ASSETS_API_INVALID_PARAM, 'domain');
    }
  }

  async request<T>(route: string, options?: BaseApiRequestOptions): Promise<T> {
    const { requireToken = true, method = 'GET', headers, params, ...otherOptions } = options ?? {};
    if (requireToken && !this.token && !(this.app && this.domain)) {
      throw BtcAssetsApiError.withComment(ErrorCodes.ASSETS_API_INVALID_PARAM, 'app, domain');
    }
    if (requireToken && !this.token) {
      await this.init();
    }

    const packedParams = params ? '?' + new URLSearchParams(params).toString() : '';
    const withOriginHeaders = this.origin ? { origin: this.origin } : void 0;
    const withAuthHeaders = requireToken && this.token ? { Authorization: `Bearer ${this.token}` } : void 0;
    const res = await fetch(`${this.url}${route}${packedParams}`, {
      method,
      headers: {
        ...withOriginHeaders,
        ...withAuthHeaders,
        ...headers,
      },
      ...otherOptions,
    } as RequestInit);

    const status = res.status;

    let text: string | undefined;
    let json: Record<string, any> | undefined;
    let ok: boolean = false;
    try {
      text = await res.text();
      json = JSON.parse(text);
      ok = json?.ok ?? res.ok ?? false;
    } catch {
      // do nothing
    }

    if (!json) {
      if (status === 200) {
        throw new BtcAssetsApiError(ErrorCodes.ASSETS_API_RESPONSE_DECODE_ERROR);
      } else if (status === 401) {
        throw new BtcAssetsApiError(ErrorCodes.ASSETS_API_UNAUTHORIZED);
      } else {
        const message = text ? `(${status}) ${text}` : `${status}`;
        throw BtcAssetsApiError.withComment(ErrorCodes.ASSETS_API_RESPONSE_ERROR, message);
      }
    }

    if (json && !ok) {
      const innerError = json?.error?.error ? `(${json.error.error.code}) ${json.error.error.message}` : void 0;
      const directError = typeof json?.error === 'string' ? json.error : void 0;
      const message = json.message ?? innerError ?? directError ?? JSON.stringify(json);
      throw BtcAssetsApiError.withComment(ErrorCodes.ASSETS_API_RESPONSE_ERROR, message);
    }

    return json! as T;
  }

  async post<T>(route: string, options?: BaseApiRequestOptions): Promise<T> {
    return this.request(route, {
      method: 'POST',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    } as BaseApiRequestOptions);
  }

  async generateToken() {
    if (!this.app || !this.domain) {
      throw BtcAssetsApiError.withComment(ErrorCodes.ASSETS_API_INVALID_PARAM, 'app, domain');
    }

    return this.post<BtcAssetsApiToken>('/token/generate', {
      requireToken: false,
      body: JSON.stringify({
        app: this.app!,
        domain: this.domain!,
      }),
    });
  }

  async init(force?: boolean) {
    // If the token exists and not a force action, do nothing
    if (this.token && !force) {
      return;
    }

    const token = await this.generateToken();
    this.token = token.token;
  }
}
