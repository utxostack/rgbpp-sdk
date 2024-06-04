import { Inject } from '@nestjs/common';
import { RpcHandler, RpcMethodHandler } from 'src/json-rpc/json-rpc.decorators';
import { CkbJumpBtcVirtualTxParams, genCkbJumpBtcVirtualTx } from 'rgbpp';
import { Collector } from 'rgbpp/ckb';

@RpcHandler()
export class RgbppService {
  constructor(@Inject('COLLECTOR') private collector: Collector) {}

  @RpcMethodHandler()
  public genCkbJumpBtcVirtualTx(params: [Omit<CkbJumpBtcVirtualTxParams, 'collector'>]) {
    console.log('genCkbJumpBtcVirtualTx', this.collector);
    const [{ xudtTypeBytes, fromCkbAddress, toRgbppLockArgs, transferAmount, witnessLockPlaceholderSize, ckbFeeRate }] =
      params;
    const virtualTx = genCkbJumpBtcVirtualTx({
      collector: this.collector,
      xudtTypeBytes,
      fromCkbAddress,
      toRgbppLockArgs,
      transferAmount,
      witnessLockPlaceholderSize,
      ckbFeeRate,
    });
    return virtualTx;
  }
}
