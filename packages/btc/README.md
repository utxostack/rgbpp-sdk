# @rgbpp-sdk/btc

This lib provides:

- APIs for constructing simple BTC transactions
- APIs for accessing the [btc-assets-api](https://github.com/ckb-cell/btc-assets-api) service in TypeScript

## Disclaimer

- The main logic of the `@rgbpp-sdk/btc` lib is referenced and cut/simplified from the [unisat wallet-sdk](https://github.com/unisat-wallet/wallet-sdk) package to adapt to the specific needs of our own projects. The unisat wallet-sdk is using the [ISC license](https://github.com/unisat-wallet/wallet-sdk/blob/master/LICENSE). If we open-source our project in the future, it would be best to include the appropriate license referencing the unisat wallet-sdk.

## Getting started

### Using the `btc-assets-api` service

If you don't have a token (API-Key) of the service for your app:

```typescript
import { BtcAssetsApi } from '@rgbpp-sdk/btc';

const service = new BtcAssetsApi({
  url: 'https://your-btc-assets-api.url',
  app: 'your-test-app-name',
  domain: 'your.app',
});

// Generate a token for your app
await service.init();
```

Instead, if you already have a token for your app:

```typescript
import { BtcAssetsApi } from '@rgbpp-sdk/btc';

const service = BtcAssetsApi.fromToken('https://your-btc-assets-api.url', 'token');
```

When initializing the service in Node.js, you should pass an extra `origin` param, which should be a URL matching your domain, or matching the domain of your token:

```typescript
import { BtcAssetsApi } from '@rgbpp-sdk/btc';

// Without token
const service = new BtcAssetsApi({
  url: 'https://your-btc-assets-api.url',
  app: 'your-test-app-name',
  domain: 'your.app',
  origin: 'https://your.app',
});

// With token
const service = BtcAssetsApi.fromToken('https://your-btc-assets-api.url', 'token', 'https://your.app');
```

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

### Constructing transaction

Transfer BTC from a `P2WPKH` address:

```typescript
import { sendBtc, BtcAssetsApi, DataSource, NetworkType } from '@rgbpp-sdk/btc';

const networkType = NetworkType.TESTNET;

const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
const source = new DataSource(service, networkType);

// Create a PSBT
const psbt = await sendBtc({
  from: account.address, // your P2WPKH address
  tos: [
    {
      address: 'to_address', // destination btc address
      value: 1000, // transfer satoshi amount
    },
  ],
  feeRate: 1, // optional
  networkType,
  source,
});

// Sign & finalize inputs
psbt.signAllInputs(account.keyPair);
psbt.finalizeAllInputs();

// Broadcast transaction
const tx = psbt.extractTransaction();
const res = await service.sendTransaction(tx.toHex());
console.log('txid:', res.txid);
```

Create an `OP_RETURN` output:

```typescript
import { sendBtc, BtcAssetsApi, DataSource, NetworkType } from '@rgbpp-sdk/btc';

const networkType = NetworkType.TESTNET;

const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
const source = new DataSource(service, networkType);

// Create a PSBT
const psbt = await sendBtc({
  from: account.address, // your address
  tos: [
    {
      data: Buffer.from('0x' + '00'.repeat(32), 'hex'), // any data <= 80 bytes
      value: 0, // normally the value is 0
    },
  ],
  feeRate: 1, // optional
  networkType,
  source,
});

// Sign & finalize inputs
psbt.signAllInputs(account.keyPair);
psbt.finalizeAllInputs();

// Broadcast transaction
const tx = psbt.extractTransaction();
const res = await service.sendTransaction(tx.toHex());
console.log('txid:', res.txid);
```

## Types

### Transaction

#### sendBtc

```typescript
declare function sendBtc(props: {
  from: string;
  tos: {
    address: string;
    value: number;
  }[];
  source: DataSource;
  networkType: NetworkType;
  minUtxoSatoshi?: number;
  changeAddress?: string;
  feeRate?: number;
}): Promise<bitcoin.Psbt>;
```

### Service

#### BtcAssetsApi

```typescript
interface BtcAssetsApi {
  init(): Promise<void>;
  generateToken(): Promise<BtcAssetsApiToken>;
  getBalance(address: string): Promise<BtcAssetsApiBalance>;
  getUtxos(address: string): Promise<BtcAssetsApiUtxo[]>;
  getTransactions(address: string): Promise<BtcAssetsApiTransaction[]>;
  getTransaction(txid: string): Promise<BtcAssetsApiTransaction>;
  sendTransaction(txHex: string): Promise<BtcAssetsApiSentTransaction>;
}
```

#### BtcAssetsApiToken

```typescript
interface BtcAssetsApiToken {
  token: string;
}
```

#### BtcAssetsApiBalance

```typescript
interface BtcAssetsApiBalance {
  address: string;
  satoshi: number;
  pending_satoshi: number;
  utxo_count: number;
}
```

#### BtcAssetsApiUtxo

```typescript
interface BtcAssetsApiUtxo {
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
```

#### BtcAssetsApiSentTransaction

```typescript
interface BtcAssetsApiSentTransaction {
  txid: string;
}
```

#### BtcAssetsApiTransaction

```typescript
interface BtcAssetsApiTransaction {
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

### Basic

#### UnspentOutput

```typescript
interface UnspentOutput {
  txid: string;
  vout: number;
  value: number;
  address: string;
  addressType: AddressType;
  scriptPk: string;
  pubkey?: string;
}
```

#### AddressType

```typescript
enum AddressType {
  P2PKH,
  P2WPKH,
  P2TR,
  P2SH_P2WPKH,
  M44_P2WPKH, // deprecated
  M44_P2TR, // deprecated
  P2WSH,
  P2SH,
  UNKNOWN,
}
```

#### NetworkType

```typescript
enum NetworkType {
  MAINNET,
  TESTNET,
  REGTEST,
}
```
