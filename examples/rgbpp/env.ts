import dotenv from 'dotenv';
import {
  blake160,
  bytesToHex,
  privateKeyToPublicKey,
  scriptToAddress,
  systemScripts,
} from '@nervosnetwork/ckb-sdk-utils';
import { NetworkType, AddressType, DataSource, OfflineDataSource, Utxo } from 'rgbpp/btc';
import { BtcApiUtxoParams, BtcAssetsApi } from 'rgbpp/service';
import { BTCTestnetType, Collector, Hex, OfflineCollector, remove0x, unpackRgbppLockArgs } from 'rgbpp/ckb';
import { createBtcAccount } from './shared/btc-account';

dotenv.config({ path: __dirname + '/.env' });

/**
 * Network
 */

export const isMainnet = process.env.IS_MAINNET === 'true';

/**
 * CKB
 */

export const collector = new Collector({
  ckbNodeUrl: process.env.CKB_NODE_URL!,
  ckbIndexerUrl: process.env.CKB_INDEXER_URL!,
});
export const CKB_PRIVATE_KEY = process.env.CKB_SECP256K1_PRIVATE_KEY!;
const secp256k1Lock: CKBComponents.Script = {
  ...systemScripts.SECP256K1_BLAKE160,
  args: bytesToHex(blake160(privateKeyToPublicKey(CKB_PRIVATE_KEY))),
};
export const ckbAddress = scriptToAddress(secp256k1Lock, isMainnet);

/**
 * BTC
 */

export const BTC_PRIVATE_KEY = process.env.BTC_PRIVATE_KEY!;
export const BTC_TESTNET_TYPE = process.env.BTC_TESTNET_TYPE! as BTCTestnetType;
export const BTC_SERVICE_URL = process.env.VITE_BTC_SERVICE_URL!;
export const BTC_SERVICE_TOKEN = process.env.VITE_BTC_SERVICE_TOKEN!;
export const BTC_SERVICE_ORIGIN = process.env.VITE_BTC_SERVICE_ORIGIN!;

// Read more about the available address types:
// - P2WPKH: https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki#p2wpkh
// - P2TR: https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki
const addressType = process.env.BTC_ADDRESS_TYPE === 'P2TR' ? AddressType.P2TR : AddressType.P2WPKH;
export const networkType = isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
export const btcAccount = createBtcAccount(BTC_PRIVATE_KEY, addressType, networkType);

export const btcService = BtcAssetsApi.fromToken(BTC_SERVICE_URL, BTC_SERVICE_TOKEN, BTC_SERVICE_ORIGIN);
export const btcDataSource = new DataSource(btcService, networkType);

export const initOfflineCkbCollector = async (
  queries: {
    lock?: CKBComponents.Script;
    type?: CKBComponents.Script;
    isDataMustBeEmpty?: boolean;
    outputCapacityRange?: Hex[];
    withEmptyType?: boolean;
  }[],
) => {
  const cells = (
    await Promise.all(
      queries.map(async (query) => {
        let cells = await collector.getCells(query);
        if (!cells || cells.length === 0) {
          throw new Error(`No cells found for query: ${JSON.stringify(query)}`);
        }
        if (query.withEmptyType) {
          cells = cells.filter((cell) => !cell.output.type);
        }
        if (cells.length === 0) {
          throw new Error(`No empty cells found for query: ${JSON.stringify(query)} with empty type`);
        }
        return Promise.all(
          cells.map(async (cell) => {
            const liveCell = await collector.getLiveCell(cell.outPoint);
            return {
              ...cell,
              status: 'live' as const,
              outputDataHash: liveCell.data?.hash,
            };
          }),
        );
      }),
    )
  ).flat();

  return {
    cells,
    collector: new OfflineCollector(cells),
  };
};

export const initOfflineBtcDataSource = async (
  rgbppLockArgsList: string[],
  feePayer?: string,
  params?: BtcApiUtxoParams,
) => {
  const btcTxIds = rgbppLockArgsList.map((rgbppLockArgs) => remove0x(unpackRgbppLockArgs(rgbppLockArgs).btcTxId));
  const btcTxs = await Promise.all(
    btcTxIds.map(async (btcTxId) => {
      const tx = await btcService.getBtcTransaction(btcTxId);
      if (!tx) {
        throw new Error(`BTC tx ${btcTxId} not found`);
      }
      return tx;
    }),
  );

  let feeUtxos: Utxo[] = [];
  if (feePayer) {
    feeUtxos = await btcDataSource.getUtxos(feePayer, params);
  }

  return new OfflineDataSource(networkType, {
    txs: btcTxs,
    feeUtxos,
  });
};
