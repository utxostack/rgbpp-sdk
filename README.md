# BTC Wallet Integration POC

This proof of concept (POC) provides:
- APIs for constructing simple BTC transactions
- APIs for accessing the `btc-assets-api` service in TypeScript

## Disclaimer

- This POC does not have an NPM package released yet. For this reason, we are using `poc-sdk` as a temporary name for the package. The name of the package may be changed in the future.
- The main logic of the POC is referenced and cut/simplified from the [unisat wallet-sdk](https://github.com/unisat-wallet/wallet-sdk) package to adapt to the specific needs of our own projects. The unisat wallet-sdk is using the [ISC license](https://github.com/unisat-wallet/wallet-sdk/blob/master/LICENSE). If we open-source our project in the future, it would be best to include the appropriate license referencing the unisat wallet-sdk.

## Getting started

### Using the `btc-assets-api` service

If you don't have a token (API-Key) of the service for your app:
```typescript
import { BtcAssetsApi } from 'poc-sdk';

const service = new BtcAssetsApi.fromApp(
  'btc_assets_api_url', 
  'your_app_name', 
  'your_domain'
);

// Generate a token for your app
await service.init();
```

Instead, if you already have a token for your app:
```typescript
import { BtcAssetsApi } from 'poc-sdk';

const service = new BtcAssetsApi.fromToken(
  'btc_assets_api_url', 
  'your_token'
);
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

Transfer BTC from a P2WPKH address:
```typescript
import { sendBtc, BtcAssetsApi, DataSource, NetworkType } from 'poc-sdk';

const service = new BtcAssetsApi.fromToken(
  'btc_assets_api_url',
  'your_token'
);

const networkType = NetworkType.TESTNET;
const source = new DataSource(service, networkType);

// Create a PSBT
const psbt = await sendBtc({
  from: 'from_address', // your P2WPKH address
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
psbt.signAllInputs(accounts.charlie.keyPair);
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
