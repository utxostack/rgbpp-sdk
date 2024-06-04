import { Inject } from '@nestjs/common';
import { RpcHandler, RpcMethodHandler } from 'src/json-rpc/json-rpc.decorators';
import { DataSource } from 'rgbpp';
import { Collector } from 'rgbpp/ckb';

@RpcHandler()
export class RgbppService {
  constructor(
    @Inject('COLLECTOR') private collector: Collector,
    @Inject('BTC_DATA_SOURCE') private btcDataSource: DataSource,
  ) {}

  @RpcMethodHandler()
  public async hello(params: unknown): Promise<{ address: string }> {
    console.log(params, this.collector, this.btcDataSource);
    const paymaster = await this.btcDataSource.getPaymasterOutput();
    return paymaster;
  }
}
