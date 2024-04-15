# @rgbpp-sdk/service

## About

The `@rgbpp-sdk/service` package provides a wrapped class to interact with `Bitcoin/RGB++ Assets Service` (BtcAssetsApi). It offers various features for interacting with Bitcoin and RGB++ assets:

- **Retrieve Blockchain Information** including Bitcoin chain info, blocks, headers, transactions, addresses, and RGB++ assets
- **Handle transactions** by posting to `/bitcoin/v1/transaction` or `/rgbpp/v1/transaction/ckb-tx`
- **Generate Bitcoin transaction Proof** via `/rgbpp/v1/btc-spv/proof` through [Bitcoin SPV Service on CKB](https://github.com/ckb-cell/ckb-bitcoin-spv-service)
- Simplify RGB++ assets workflows with **RGB++ CKB transaction Queue** and cron jobs
- More detailed API documentation can be found on [Testnet](https://btc-assets-api.testnet.mibao.pro/docs) and [Mainnet](https://api.rgbpp.io/docs)

## Installation

```bash
# Install via npm:
$ npm i @rgbpp-sdk/service@snap
# Install via yarn:
$ yarn add @rgbpp-sdk/service@snap
# Install via pnpm:
$ pnpm add @rgbpp-sdk/service@snap
```

## Get started

### Get an access token

The BtcAssetsApi is currently limited to verified apps only.
If you're a developer and want to access the BtcAssetsApi service,
please email us to request a JWT token for your app: f@cell.studio.

In the email, you should provide us some information about your app:

- `name`: Your app name, e.g. "rgbpp-app"
- `domain`: Your app domain, e.g. "rgbpp.app" (without protocol)

### Initialize the service

#### Browser

Initialize BtcAssetsApi service with your access token:

```typescript
import { BtcAssetsApi } from '@rgbpp-sdk/service';

const service = BtcAssetsApi.fromToken('https://your-btc-assets-api.url', 'your_access_token');
```

#### Node.js

You should pass `origin` when initializing BtcAssetsApi service in Node.js:

```typescript
import { BtcAssetsApi } from '@rgbpp-sdk/service';

const service = BtcAssetsApi.fromToken('https://your-btc-assets-api.url', 'your_access_token', 'https://your.app');
```

The `origin` prop is used to verify your token's corresponding `domain`.
For example, if your token was generated in the domain of `your.app`,
you should pass `https://your.app` as the `origin` prop.
Otherwise, the service will reject your request.

Note the format difference `domain` and `origin`:

- `domain`: `your.app`, without protocol (`https://`, `http://`, etc.)
- `origin`: `https://your.app`, with protocol `https://`

### Start using the service

Once the initialization is complete, you can query from the service:

```typescript
// Query the balance of an address
const res = await service.getBalance('tb1qm06rvrq8jyyckzc5v709u7qpthel9j4d9f7nh3');

console.log(res);
// {
//   address: 'tb1qm06rvrq8jyyckzc5v709u7qpthel9j4d9f7nh3',
//   satoshi: 72921,
//   pending_satoshi: 0,
//   utxo_count: 5
// }
```

All available APIs in the [BtcAssetsApi](#btcassetsapi-1) section.

## Types

### BtcAssetsApi

```typescript
declare class BtcAssetsApi extends BtcAssetsApiBase implements BtcApis, RgbppApis {
  static fromToken(baseUrl: string, token: string, origin?: string): BtcAssetsApi;
}
```

### BtcAssetsApiBase

```typescript
declare class BtcAssetsApiBase implements BaseApis {}
```

### BaseApis

```typescript
interface BaseApis {
  request<T>(route: string, options?: BaseApiRequestOptions): Promise<T>;
  post<T>(route: string, options?: BaseApiRequestOptions): Promise<T>;
  generateToken(): Promise<BtcAssetsApiToken>;
  init(force?: boolean): Promise<void>;
}

interface BaseApiRequestOptions extends RequestInit {
  params?: Record<string, any>;
  method?: 'GET' | 'POST';
  requireToken?: boolean;
}

interface BtcAssetsApiToken {
  token: string;
}
```

### BtcApis

```typescript
interface BtcApis {
  getBtcBlockchainInfo(): Promise<BtcApiBlockchainInfo>;
  getBtcBlockByHash(blockHash: string): Promise<BtcApiBlock>;
  getBtcBlockHeaderByHash(blockHash: string): Promise<BtcApiBlockHeader>;
  getBtcBlockHashByHeight(blockHeight: number): Promise<BtcApiBlockHash>;
  getBtcBlockTransactionIdsByHash(blockHash: number): Promise<BtcApiBlockTransactionIds>;
  getBtcBalance(address: string, params?: BtcApiBalanceParams): Promise<BtcApiBalance>;
  getBtcUtxos(address: string, params?: BtcApiUtxoParams): Promise<BtcApiUtxo[]>;
  getBtcTransactions(address: string): Promise<BtcApiTransaction[]>;
  getBtcTransaction(txId: string): Promise<BtcApiTransaction>;
  sendBtcTransaction(txHex: string): Promise<BtcApiSentTransaction>;
}

interface BtcApiBlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: number;
  difficulty: number;
  mediantime: number;
}

interface BtcApiBlock {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
  merkle_root: string;
  previousblockhash: string;
  mediantime: number;
  nonce: number;
  bits: number;
  difficulty: number;
}

interface BtcApiBlockHash {
  hash: string;
}

interface BtcApiBlockHeader {
  header: string;
}

interface BtcApiBlockTransactionIds {
  txids: string[];
}

interface BtcApiBalanceParams {
  min_satoshi?: number;
}

interface BtcApiBalance {
  address: string;
  satoshi: number;
  pending_satoshi: number;
  dust_satoshi: number;
  utxo_count: number;
}

interface BtcApiUtxoParams {
  only_confirmed?: boolean;
  min_satoshi?: number;
}

interface BtcApiUtxo {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
}

interface BtcApiSentTransaction {
  txid: string;
}

interface BtcApiTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: {
    txid: string;
    vout: number;
    prevout: {
      scriptpubkey: string;
      scriptpubkey_asm: string;
      scriptpubkey_type: string;
      scriptpubkey_address: string;
      value: number;
    };
    scriptsig: string;
    scriptsig_asm: string;
    witness: string[];
    is_coinbase: boolean;
    sequence: number;
  }[];
  vout: {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number;
  }[];
  weight: number;
  size: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
}
```

### RgbppApis

```typescript
interface RgbppApis {
  getRgbppPaymasterInfo(): Promise<RgbppApiPaymasterInfo>;
  getRgbppTransactionHash(btcTxId: string): Promise<RgbppApiCkbTransactionHash>;
  getRgbppTransactionState(btcTxId: string): Promise<RgbppApiTransactionState>;
  getRgbppAssetsByBtcTxId(btcTxId: string): Promise<Cell[]>;
  getRgbppAssetsByBtcUtxo(btcTxId: string, vout: number): Promise<Cell[]>;
  getRgbppAssetsByBtcAddress(btcAddress: string, params?: RgbppApiAssetsByAddressParams): Promise<Cell[]>;
  getRgbppSpvProof(btcTxId: string, confirmations: number): Promise<RgbppApiSpvProof>;
  sendRgbppCkbTransaction(payload: RgbppApiSendCkbTransactionPayload): Promise<RgbppApiTransactionState>;
  retryRgbppCkbTransaction(payload: RgbppApiRetryCkbTransactionPayload): Promise<RgbppApiTransactionRetry>;
}

type RgbppTransactionState = 'completed' | 'failed' | 'delayed' | 'active' | 'waiting';

interface RgbppApiPaymasterInfo {
  btc_address: string;
  fee: number;
}

interface RgbppApiCkbTransactionHash {
  txhash: string;
}

interface RgbppApiTransactionState {
  state: RgbppTransactionState;
}

interface RgbppApiAssetsByAddressParams {
  type_script?: string;
}

interface RgbppApiSpvProof {
  proof: string;
  spv_client: {
    tx_hash: string;
    index: string;
  };
}

interface RgbppApiSendCkbTransactionPayload {
  btc_txid: string;
  ckb_virtual_result: {
    ckbRawTx: CKBComponents.RawTransaction;
    needPaymasterCell: boolean;
    sumInputsCapacity: string;
    commitment: string;
  };
}

interface RgbppApiRetryCkbTransactionPayload {
  btc_txid: string;
}

interface RgbppApiTransactionRetry {
  success: boolean;
  state: RgbppTransactionState;
}
```
