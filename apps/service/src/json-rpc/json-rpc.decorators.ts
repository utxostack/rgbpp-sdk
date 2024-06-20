import { applyDecorators, Injectable, InjectableOptions, SetMetadata } from '@nestjs/common';

export const JsonRpcMetadataKey = '__json-rpc@metadata__';
export interface JsonRpcMetadata {
  name?: string;
}

export const JsonRpcMethodMetadataKey = '__json-rpc-method@metadata__';
export interface JsonRpcMethodMetadata {
  name?: string;
}

export const RpcHandler = (data?: JsonRpcMetadata & InjectableOptions) => {
  const { name, scope } = data ?? {};
  return applyDecorators(SetMetadata(JsonRpcMetadataKey, name ? { name } : {}), Injectable({ scope }));
};

export const RpcMethodHandler = (data?: JsonRpcMethodMetadata) => {
  return applyDecorators(SetMetadata(JsonRpcMethodMetadataKey, data ?? {}));
};
