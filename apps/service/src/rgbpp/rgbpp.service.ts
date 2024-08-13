import { Inject } from '@nestjs/common';
import { DataSource, NetworkType } from 'rgbpp/btc';
import { BtcAssetsApi, RgbppApiTransactionState } from 'rgbpp/service';
import { BTCTestnetType, Collector, Hex, append0x } from 'rgbpp/ckb';
import { buildRgbppTransferTx, buildRgbppTransferAllTxs } from 'rgbpp';
import { RpcHandler, RpcMethodHandler } from '../json-rpc/json-rpc.decorators.js';
import { toSnakeCase, toCamelCase, SnakeCased } from '../utils/case.js';
import { ensureSafeJson } from '../utils/json.js';
import {
  RgbppTransferReq,
  RgbppCkbBtcTransaction,
  RgbppCkbTxBtcTxId,
  RgbppStateReq,
  RgbppCkbTxHashReq,
  BtcTxSendReq,
  RgbppTransferAllReq,
  RgbppTransferAllRes,
} from './types.js';

@RpcHandler()
export class RgbppService {
  private readonly btcDataSource: DataSource;

  constructor(
    @Inject('IS_MAINNET') private isMainnet: boolean,
    @Inject('CKB_COLLECTOR') private ckbCollector: Collector,
    @Inject('BTC_ASSETS_API') private btcAssetsApi: BtcAssetsApi,
    @Inject('BTC_TESTNET_TYPE') private btcTestnetType: BTCTestnetType,
  ) {
    const networkType = isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
    this.btcDataSource = new DataSource(btcAssetsApi, networkType);
  }

  @RpcMethodHandler({ name: 'generate_rgbpp_transfer_tx' })
  public async generateRgbppTransferTx(request: [RgbppTransferReq]): Promise<SnakeCased<RgbppCkbBtcTransaction>> {
    const params = toCamelCase(request[0]);
    const result = await buildRgbppTransferTx({
      ckb: {
        collector: this.ckbCollector,
        xudtTypeArgs: params.xudtTypeArgs,
        rgbppLockArgsList: params.rgbppLockArgsList,
        transferAmount: BigInt(params.transferAmount),
      },
      btc: {
        fromAddress: params.fromBtcAddress,
        toAddress: params.toBtcAddress,
        dataSource: this.btcDataSource,
        testnetType: this.btcTestnetType,
      },
      isMainnet: this.isMainnet,
    });

    return toSnakeCase<RgbppCkbBtcTransaction>({
      ckbVirtualTxResult: JSON.stringify(result.ckbVirtualTxResult),
      btcPsbtHex: result.btcPsbtHex,
    });
  }

  @RpcMethodHandler({ name: 'generate_rgbpp_transfer_all_txs' })
  public async generateRgbppTransferAllTxs(request: [RgbppTransferAllReq]): Promise<SnakeCased<RgbppTransferAllRes>> {
    const params = toCamelCase(request[0]);
    const result = await buildRgbppTransferAllTxs({
      ckb: {
        collector: this.ckbCollector,
        xudtTypeArgs: params.ckb.xudtTypeArgs,
        feeRate: params.ckb.feeRate ? BigInt(append0x(params.ckb.feeRate)) : undefined,
      },
      btc: {
        assetAddresses: params.btc.assetAddresses,
        fromAddress: params.btc.fromAddress,
        toAddress: params.btc.toAddress,
        fromPubkey: params.btc.fromPubkey,
        pubkeyMap: params.btc.pubkeyMap,
        feeRate: params.btc.feeRate,
        dataSource: this.btcDataSource,
        testnetType: this.btcTestnetType,
      },
      isMainnet: this.isMainnet,
    });

    return ensureSafeJson<SnakeCased<RgbppTransferAllRes>>(
      toSnakeCase<RgbppTransferAllRes>({
        ...result,
        transactions: result.transactions.map((group) => {
          return {
            ...group,
            ckb: {
              ...group.ckb,
              virtualTxResult: JSON.stringify(group.ckb.virtualTxResult),
            },
          };
        }),
      }),
    );
  }

  @RpcMethodHandler({ name: 'report_rgbpp_ckb_tx_btc_txid' })
  public async reportRgbppCkbTxBtcTxId(request: [RgbppCkbTxBtcTxId]): Promise<SnakeCased<RgbppApiTransactionState>> {
    const { ckbVirtualTxResult, btcTxId } = toCamelCase(request[0]);
    const response = await this.btcAssetsApi.sendRgbppCkbTransaction({
      btc_txid: btcTxId,
      ckb_virtual_result: ckbVirtualTxResult,
    });
    return toSnakeCase<RgbppApiTransactionState>(response);
  }

  @RpcMethodHandler({ name: 'get_rgbpp_tx_state' })
  public async getRgbppTxState(request: [RgbppStateReq]): Promise<SnakeCased<RgbppApiTransactionState>> {
    const {
      btcTxId,
      params: { withData },
    } = toCamelCase(request[0]);
    const response = await this.btcAssetsApi.getRgbppTransactionState(btcTxId, { with_data: withData });
    return toSnakeCase<RgbppApiTransactionState>(response);
  }

  @RpcMethodHandler({ name: 'get_rgbpp_ckb_tx_hash' })
  public async getRgbppCkbTxHash(request: [RgbppCkbTxHashReq]): Promise<Hex> {
    const { btcTxId } = toCamelCase(request[0]);
    const { txhash: txHash } = await this.btcAssetsApi.getRgbppTransactionHash(btcTxId);
    return txHash;
  }

  @RpcMethodHandler({ name: 'send_btc_transaction' })
  public async sendBtcTransaction(request: [BtcTxSendReq]): Promise<Hex> {
    const { txHex } = toCamelCase(request[0]);
    const { txid } = await this.btcAssetsApi.sendBtcTransaction(txHex);
    return txid;
  }
}
