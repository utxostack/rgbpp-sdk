import { isDomain } from '../utils';
import { BtcAssetsApiError, ErrorCodes } from '../error';
import { BaseApis, BaseApiRequestOptions, BtcAssetsApiToken } from '../types';
import { pickBy } from 'lodash';

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
    const { requireToken = true, allow404 = false, method = 'GET', headers, params, ...otherOptions } = options ?? {};
    if (requireToken && !this.token && !(this.app && this.domain)) {
      throw BtcAssetsApiError.withComment(ErrorCodes.ASSETS_API_INVALID_PARAM, 'app, domain');
    }
    if (requireToken && !this.token) {
      await this.init();
    }

    const packedParams = params ? '?' + new URLSearchParams(pickBy(params, (val) => val !== undefined)).toString() : '';
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

    const status = res.status;
    let comment: string | undefined;

    if (!json) {
      comment = text ? `(${status}) ${text}` : `${status}`;
    }
    if (json && !ok) {
      const code = json.code ?? json.statusCode ?? json.error?.error?.code ?? res.status;
      const message = json.message ?? (typeof json.error === 'string' ? json.error : json.error?.error?.message);
      if (message) {
        comment = code ? `(${code}) ${message}` : message;
      } else {
        comment = JSON.stringify(json);
      }
    }

    if (status === 200 && !json) {
      throw BtcAssetsApiError.withComment(ErrorCodes.ASSETS_API_RESPONSE_DECODE_ERROR, comment);
    }
    if (status === 401) {
      throw BtcAssetsApiError.withComment(ErrorCodes.ASSETS_API_UNAUTHORIZED, comment);
    }
    if (status === 404 && !allow404) {
      throw BtcAssetsApiError.withComment(ErrorCodes.ASSETS_API_RESOURCE_NOT_FOUND, comment);
    }
    if (status !== 200 && status !== 404 && !allow404) {
      throw BtcAssetsApiError.withComment(ErrorCodes.ASSETS_API_RESPONSE_ERROR, comment);
    }
    if (status !== 200) {
      return void 0 as T;
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
