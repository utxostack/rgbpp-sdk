# @rgbpp-sdk/btc

## About

This is the BTC part of the rgbpp-sdk for:

- BTC/RGBPP transaction construction
- Wrapped API of the [BtcAssetsApi](https://github.com/ckb-cell/btc-assets-api) service in Node and browser

This lib is based on the foundation of the [unisat wallet-sdk](https://github.com/unisat-wallet/wallet-sdk) ([license](https://github.com/unisat-wallet/wallet-sdk/blob/master/LICENSE)). We've simplified the logic of transaction construction and fee collection process to adapt to the specific needs of RGBPP. You can refer to the unisat wallet-sdk repo for more difference.

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

const psbt = await sendBtc({
  from: account.address, // your P2WPKH address
  tos: [
    {
      address: 'to_address', // destination btc address
      value: 1000, // transfer satoshi amount
    },
  ],
  feeRate: 1, // optional, default to 1 sat/vbyte
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

Transfer BTC from a `P2TR` address:

```typescript
import { sendBtc, BtcAssetsApi, DataSource, NetworkType } from '@rgbpp-sdk/btc';

const networkType = NetworkType.TESTNET;

const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
const source = new DataSource(service, networkType);

const psbt = await sendBtc({
  from: account.address, // your P2TR address
  fromPubkey: account.publicKey, // your public key, this is required for P2TR
  tos: [
    {
      address: 'to_address', // destination btc address
      value: 1000, // transfer satoshi amount
    },
  ],
  feeRate: 1, // optional, default to 1 sat/vbyte
  networkType,
  source,
});

// Create a tweaked signer
const tweakedSigner = tweakSigner(account.keyPair, {
  network,
});

// Sign & finalize inputs
psbt.signAllInputs(tweakedSigner);
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
  changeAddress: account.address, // optional, where to send the change
  feeRate: 1, // optional, default to 1 sat/vbyte
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

Transfer with predefined inputs/outputs:

```typescript
import { sendUtxos, BtcAssetsApi, DataSource, NetworkType } from '@rgbpp-sdk/btc';

const networkType = NetworkType.TESTNET;

const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
const source = new DataSource(service, networkType);

const psbt = await sendUtxos({
  inputs: [
    {
      txid: 'txid',
      vout: 1,
      value: 546,
      address: 'btc_address',
      addressType: AddressType.P2WPKH,
      scriptPk: 'script_publickey_hex',
    },
  ],
  outputs: [
    {
      data: Buffer.from('commentment_hex', 'hex'), // RGBPP commitment
      value: 0,
      fixed: true, // mark as fixed, so the output.value will not be changed
    },
    {
      address: 'to_address',
      value: 546,
      fixed: true,
      minUtxoSatoshi: 546, // customize the dust limit of the output
    },
  ],
  from: account.address, // provide fee to the transaction
  changeAddress: account.address, // optional, where to send the change
  feeRate: 1, // optional, default to 1 sat/vbyte
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
interface sendBtc {
  (props: {
    from: string;
    tos: InitOutput[];
    source: DataSource;
    networkType: NetworkType;
    minUtxoSatoshi?: number;
    changeAddress?: string;
    fromPubkey?: string;
    feeRate?: number;
  }): Promise<bitcoin.Psbt>;
}
```

#### sendUtxos

```typescript
interface sendUtxos {
  (props: {
    inputs: Utxo[];
    outputs: InitOutput[];
    source: DataSource;
    networkType: NetworkType;
    from: string;
    fromPubkey?: string;
    changeAddress?: string;
    minUtxoSatoshi?: number;
    feeRate?: number;
  }): Promise<bitcoin.Psbt>;
}
```

#### InitOutput

```typescript
type InitOutput = TxAddressOutput | TxDataOutput | TxScriptOutput;
```

#### TxAddressOutput / TxDataOutput / TxScriptOutput

```typescript
interface TxAddressOutput extends BaseOutput {
  address: string;
}
```

```typescript
interface TxDataOutput extends BaseOutput {
  data: Buffer | string;
}
```

```typescript
interface TxScriptOutput extends BaseOutput {
  script: Buffer;
}
```

#### BaseOutput

```typescript
interface BaseOutput {
  value: number;
  fixed?: boolean;
  protected?: boolean;
  minUtxoSatoshi?: number;
}
```

#### DataSource

```typescript
interface DataSource {
  constructor(service: BtcAssetsApi, networkType: NetworkType): void;
  getUtxos(address: string, params?: BtcAssetsApiUtxoParams): Promise<Utxo[]>;
  collectSatoshi(props: {
    address: string;
    targetAmount: number;
    minUtxoSatoshi?: number;
    excludeUtxos?: {
      txid: string;
      vout: number;
    }[];
  }): Promise<{
    utxos: Utxo[];
    satoshi: number;
    exceedSatoshi: number;
  }>;
}
```

### Service

#### BtcAssetsApi

```typescript
interface BtcAssetsApi {
  init(): Promise<void>;
  generateToken(): Promise<BtcAssetsApiToken>;
  getBalance(address: string, params?: BtcAssetsApiBalanceParams): Promise<BtcAssetsApiBalance>;
  getUtxos(address: string, params?: BtcAssetsApiUtxoParams): Promise<BtcAssetsApiUtxo[]>;
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

#### BtcAssetsApiBalanceParams

```typescript
interface BtcAssetsApiBalanceParams {
  min_satoshi?: number;
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

#### BtcAssetsApiUtxoParams

```typescript
interface BtcAssetsApiUtxoParams {
  min_satoshi?: number;
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

#### Utxo

```typescript
interface Utxo {
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
