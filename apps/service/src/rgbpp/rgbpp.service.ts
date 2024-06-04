import { RpcHandler, RpcMethodHandler } from 'src/json-rpc/json-rpc.decorators';
// import { genCkbJumpBtcVirtualTx } from 'rgbpp';

@RpcHandler()
export class RgbppService {
  @RpcMethodHandler({ name: 'genCkbJumpBtcVirtualTx' })
  public getHello(params: unknown): string {
    console.log(params);
    // return genCkbJumpBtcVirtualTx(params);
    return 'genCkbJumpBtcVirtualTx called';
  }
}
