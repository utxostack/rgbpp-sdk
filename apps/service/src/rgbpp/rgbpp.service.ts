import { RpcHandler, RpcMethodHandler } from 'src/json-rpc/json-rpc.decorators';

@RpcHandler({ name: 'rgbpp' })
export class RgbppService {
  @RpcMethodHandler({ name: 'hello' })
  public getHello(params: unknown): string {
    console.log(params);
    return 'Hello World!';
  }
}
