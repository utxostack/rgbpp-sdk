import { Inject } from '@nestjs/common';
import { RpcHandler, RpcMethodHandler } from 'src/json-rpc/json-rpc.decorators';
import { DataSource } from 'rgbpp/btc';
import { Collector, toCamelcase } from 'rgbpp/ckb';
import { RgbppTransferReq, RgbppTransferResp } from './types';
import { toSnakeCase } from 'src/utils/snake';
import { buildRgbppTransferTx } from 'rgbpp';

@RpcHandler()
export class RgbppService {
  constructor(
    @Inject('IS_MAINNET') private isMainnet: boolean,
    @Inject('COLLECTOR') private collector: Collector,
    @Inject('BTC_DATA_SOURCE') private btcDataSource: DataSource,
  ) {}

  @RpcMethodHandler({ name: 'generate_rgbpp_transfer_tx' })
  public async generateRgbppTransferTx(request: object[]) {
    const { xudtTypeArgs, rgbppLockArgsList, transferAmount, fromBtcAddress, toBtcAddress } =
      toCamelcase<RgbppTransferReq>(request[0]);
    const { ckbVirtualTxResult, btcPsbtHex } = await buildRgbppTransferTx({
      collector: this.collector,
      xudtTypeArgs,
      rgbppLockArgsList,
      transferAmount: BigInt(transferAmount),
      fromBtcAddress,
      toBtcAddress,
      btcDataSource: this.btcDataSource,
      isMainnet: this.isMainnet,
    });
    const response: RgbppTransferResp = {
      ckbVirtualTxResult: JSON.stringify(ckbVirtualTxResult),
      btcPsbtHex,
    };
    return toSnakeCase(response);
  }
}
