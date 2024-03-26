# @rgbpp-sdk/btc

## About

This is the BTC part of the rgbpp-sdk for:

- BTC/RGBPP transaction construction
- Wrapped API of the [BtcAssetsApi](https://github.com/ckb-cell/btc-assets-api) service in Node and browser

This lib is based on the foundation of the [unisat wallet-sdk](https://github.com/unisat-wallet/wallet-sdk) ([license](https://github.com/unisat-wallet/wallet-sdk/blob/master/LICENSE)). We've simplified the logic of transaction construction and fee collection process to adapt to the specific needs of RGBPP. You can refer to the unisat wallet-sdk repo for more difference.

## Installation

```bash
# Install via npm:
$ npm i @rgbpp-sdk/btc
# Install via yarn:
$ yarn add @rgbpp-sdk/btc
# Install via pnpm:
$ pnpm add @rgbpp-sdk/btc
```

## BtcAssetsApi

### Get an access token

The BtcAssetsApi is currently limited to verified apps only.
If you're a developer and want to access the BtcAssetsApi service,
please email us to request a JWT token for your app: cipher@cell.studio.

In the email, you should provide us some information about your app:

- `name`: Your app name, e.g. "rgbpp-app"
- `domain`: Your app domain, e.g. "rgbpp.app" (without protocol)

### Initialize the service

#### Browser

Initialize BtcAssetsApi service with your access token:

```typescript
import { BtcAssetsApi } from '@rgbpp-sdk/btc';

const service = BtcAssetsApi.fromToken('https://your-btc-assets-api.url', 'your_access_token');
```

#### Node.js

You should pass `origin` when initializing BtcAssetsApi service in Node.js:

```typescript
import { BtcAssetsApi } from '@rgbpp-sdk/btc';

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

## Transaction

### Transfer BTC from a `P2WPKH` address

```typescript
import { sendBtc, BtcAssetsApi, DataSource, NetworkType } from '@rgbpp-sdk/btc';

const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
const source = new DataSource(service, NetworkType.TESTNET);

const psbt = await sendBtc({
  from: account.address, // your P2WPKH address
  tos: [
    {
      address: 'to_address', // destination btc address
      value: 1000, // transfer satoshi amount
    },
  ],
  feeRate: 1, // optional, default to 1 sat/vbyte
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

### Transfer BTC from a `P2TR` address

```typescript
import { sendBtc, BtcAssetsApi, DataSource, NetworkType } from '@rgbpp-sdk/btc';

const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
const source = new DataSource(service, NetworkType.TESTNET);

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

### Create an `OP_RETURN` output

```typescript
import { sendBtc, BtcAssetsApi, DataSource, NetworkType } from '@rgbpp-sdk/btc';

const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
const source = new DataSource(service, NetworkType.TESTNET);

// Create a PSBT
const psbt = await sendBtc({
  from: account.address, // your address
  tos: [
    {
      data: Buffer.from('0x' + '00'.repeat(32), 'hex'), // any data <= 80 bytes
      value: 0, // normally the value is 0
    },
  ],
  changeAddress: account.address, // optional, where to return the change
  feeRate: 1, // optional, default to 1 sat/vbyte
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

### Transfer with predefined inputs/outputs

```typescript
import { sendUtxos, BtcAssetsApi, DataSource, NetworkType } from '@rgbpp-sdk/btc';

const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
const source = new DataSource(service, NetworkType.TESTNET);

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
  fromPubkey: account.publicKey, // optional, required if "from" is a P2TR address
  changeAddress: account.address, // optional, where to send the change
  feeRate: 1, // optional, default to 1 sat/vbyte
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

### Construct a isomorphic RGBPP transaction

```typescript
import { sendRgbppUtxos, BtcAssetsApi, DataSource, NetworkType } from '@rgbpp-sdk/btc';
import { RGBPP_UTXO_DUST_LIMIT, BTC_UTXO_DUST_LIMIT } from '@rgbpp-sdk/btc';
import { Collector } from '@rgbpp-sdk/ckb';

const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
const source = new DataSource(service, NetworkType.TESTNET);

const ckbVirtualTx: RawTransaction = {
  // ...
  inputs: [
    /* RgbppLock cells, and an optional paymaster cell */
  ],
  outputs: [
    /* RgbppLock/RgbppTimeLock cells, and an optional change cell */
  ],
} as any;
const ckbCollector = new Collector({
  ckbNodeUrl: 'ckb_node_url',
  ckbIndexerUrl: 'ckb_indexer_url',
});

const psbt = await sendRgbppUtxos({
  ckbVirtualTx, // a CKB virtual tx containing "L1 -> L1" or "L1 -> L2" action
  paymaster: {
    // if paymaster cell was included in the ckbVirtualTx, pay to paymaster
    address: 'paymaster_btc_address',
    value: 10000,
  },
  commitment: 'rgbpp_tx_commitment',
  tos: [
    // the address of the generating outputs, optional, default is "from"
    'transfer_rgbpp_to_btc_address',
  ],

  source,
  ckbCollector,
  from: accounts.address,
  fromPubkey: account.publicKey, // if "from" is a P2TR address, "fromPubkey" is required
  changeAddress: 'address_to_return_change', // optional, where should the change satoshi be returned to
  minUtxoSatoshi: BTC_UTXO_DUST_LIMIT, // optional, default to 1000, officially should be 1,0000
  rgbppMinUtxoSatoshi: RGBPP_UTXO_DUST_LIMIT, // optional, default to 546
  feeRate: 1, // optional, default to 1 sat/vbyte
});
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
    fromPubkey?: string;
    changeAddress?: string;
    minUtxoSatoshi?: number;
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
    from: string;
    fromPubkey?: string;
    changeAddress?: string;
    minUtxoSatoshi?: number;
    feeRate?: number;
  }): Promise<bitcoin.Psbt>;
}
```

#### sendRgbppUtxos

```typescript
interface sendRgbppUtxos {
  (props: {
    ckbVirtualTx: RawTransaction;
    commitment: Hash;
    tos?: string[];
    paymaster?: TxAddressOutput;

    ckbNodeUrl: string;
    rgbppLockCodeHash: Hash;
    rgbppTimeLockCodeHash: Hash;
    rgbppMinUtxoSatoshi?: number;

    from: string;
    source: DataSource;
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
  getRecommendedFeeRates(): Promise<FeesRecommended>;
  getAverageFeeRate(): Promise<number>;
}
```

#### FeesRecommended

```typescript
interface FeesRecommended {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  minimumFee: number;
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
