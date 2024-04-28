export interface BaseApis {
  request<T>(route: string, options?: BaseApiRequestOptions): Promise<T>;
  post<T>(route: string, options?: BaseApiRequestOptions): Promise<T>;
  generateToken(): Promise<BtcAssetsApiToken>;
  init(force?: boolean): Promise<void>;
}

export interface BaseApiRequestOptions extends RequestInit {
  params?: Record<string, any>;
  method?: 'GET' | 'POST';
  requireToken?: boolean;
  allow404?: boolean;
}

export interface BtcAssetsApiToken {
  token: string;
}

export interface BtcAssetsApiContext {
  request: {
    url: string;
    body?: Record<string, any>;
    params?: Record<string, any>;
  };
  response: {
    status: number;
    data?: Record<string, any> | string;
  };
}
