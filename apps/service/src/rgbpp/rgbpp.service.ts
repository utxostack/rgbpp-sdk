import { Inject } from '@nestjs/common';
import { RpcHandler, RpcMethodHandler } from 'src/json-rpc/json-rpc.decorators';
import { DataSource, NetworkType } from 'rgbpp/btc';
import { Collector, toCamelcase } from 'rgbpp/ckb';
import { RgbppTransferReq, RgbppCkbBtcTransaction, RgbppCkbTxBtcTxId, RgbppStateReq } from './types';
import { toSnakeCase } from 'src/utils/snake';
import { buildRgbppTransferTx } from 'rgbpp';
import { BtcAssetsApi, RgbppApiTransactionState } from 'rgbpp/service';

@RpcHandler()
export class RgbppService {
  constructor(
    @Inject('IS_MAINNET') private isMainnet: boolean,
    @Inject('COLLECTOR') private collector: Collector,
    @Inject('BTC_ASSETS_API') private btcAssetsApi: BtcAssetsApi,
  ) {}

  @RpcMethodHandler({ name: 'generate_rgbpp_transfer_tx' })
  public async generateRgbppTransferTx(request: object[]) {
    const { xudtTypeArgs, rgbppLockArgsList, transferAmount, fromBtcAddress, toBtcAddress } =
      toCamelcase<RgbppTransferReq>(request[0]);
    const networkType = this.isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
    const btcDataSource = new DataSource(this.btcAssetsApi, networkType);
    const { ckbVirtualTxResult, btcPsbtHex } = await buildRgbppTransferTx({
      collector: this.collector,
      xudtTypeArgs,
      rgbppLockArgsList,
      transferAmount: BigInt(transferAmount),
      fromBtcAddress,
      toBtcAddress,
      btcDataSource,
      isMainnet: this.isMainnet,
    });
    const response: RgbppCkbBtcTransaction = {
      ckbVirtualTxResult: JSON.stringify(ckbVirtualTxResult),
      btcPsbtHex,
    };
    return toSnakeCase(response);
  }

  @RpcMethodHandler({ name: 'report_rgbpp_ckb_tx_btc_txid' })
  public async reportRgbppCkbTxBtcTxId(request: object[]) {
    const { ckbVirtualTxResult, btcTxId } = toCamelcase<RgbppCkbTxBtcTxId>(request[0]);
    const { state } = await this.btcAssetsApi.sendRgbppCkbTransaction({
      btc_txid: btcTxId,
      ckb_virtual_result: ckbVirtualTxResult,
    });
    return state;
  }

  @RpcMethodHandler({ name: 'get_rgbpp_tx_state' })
  public async getRgbppTxState(request: object[]): Promise<RgbppApiTransactionState> {
    const {
      btcTxId,
      params: { withData },
    } = toCamelcase<RgbppStateReq>(request[0]);
    const response = await this.btcAssetsApi.getRgbppTransactionState(btcTxId, { with_data: withData });
    return response;
  }
}
