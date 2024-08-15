import { RpcHandler, RpcMethodHandler } from './json-rpc/json-rpc.decorators.js';
import pkg from '../package.json' with { type: 'json' };

@RpcHandler()
export class AppService {
  @RpcMethodHandler({ name: 'get_version' })
  public getAppVersion(): string {
    return pkg.version;
  }
}
