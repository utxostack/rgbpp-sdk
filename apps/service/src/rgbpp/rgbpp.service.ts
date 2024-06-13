import { Inject } from '@nestjs/common';
import { RpcHandler, RpcMethodHandler } from 'src/json-rpc/json-rpc.decorators';
import { DataSource, NetworkType } from 'rgbpp/btc';
import { BTCTestnetType, Collector, Hex, toCamelcase } from 'rgbpp/ckb';
import { RgbppTransferReq, RgbppCkbBtcTransaction, RgbppCkbTxBtcTxId, RgbppStateReq, RgbppCkbTxHashReq } from './types';
import { toSnakeCase } from 'src/utils/snake';
import { buildRgbppTransferTx } from 'rgbpp';
import { BtcAssetsApi } from 'rgbpp/service';

@RpcHandler()
export class RgbppService {
  constructor(
    @Inject('IS_MAINNET') private isMainnet: boolean,
    @Inject('BTC_TESTNET_TYPE') private btcTestnetType: BTCTestnetType,
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
      ckb: {
        collector: this.collector,
        xudtTypeArgs,
        rgbppLockArgsList,
        transferAmount: BigInt(transferAmount),
      },
      btc: {
        fromAddress: fromBtcAddress,
        toAddress: toBtcAddress,
        dataSource: btcDataSource,
        testnetType: this.btcTestnetType,
      },
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
    const response = await this.btcAssetsApi.sendRgbppCkbTransaction({
      btc_txid: btcTxId,
      ckb_virtual_result: ckbVirtualTxResult,
    });
    return toSnakeCase(response);
  }

  @RpcMethodHandler({ name: 'get_rgbpp_tx_state' })
  public async getRgbppTxState(request: object[]) {
    const {
      btcTxId,
      params: { withData },
    } = toCamelcase<RgbppStateReq>(request[0]);
    const response = await this.btcAssetsApi.getRgbppTransactionState(btcTxId, { with_data: withData });
    return toSnakeCase(response);
  }

  @RpcMethodHandler({ name: 'get_rgbpp_ckb_tx_hash' })
  public async getRgbppCkbTxHash(request: object[]): Promise<Hex> {
    const { btcTxId } = toCamelcase<RgbppCkbTxHashReq>(request[0]);
    const { txhash: txHash } = await this.btcAssetsApi.getRgbppTransactionHash(btcTxId);
    return txHash;
  }
}
