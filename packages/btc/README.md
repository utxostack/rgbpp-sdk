# @rgbpp-sdk/btc

## About

This is the BTC part of the rgbpp-sdk for BTC/RGBPP transaction construction.

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

## Transaction

### Transfer BTC from a `P2WPKH` address

```typescript
import { sendBtc, DataSource, NetworkType } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

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
  onlyConfirmedUtxos: false, // optional, default to false, only confirmed utxos are allowed in the transaction
  feeRate: 1, // optional, default to 1 on the testnet, and it is a floating number on the mainnet
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
import { sendBtc, DataSource, NetworkType } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

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
  onlyConfirmedUtxos: false, // optional, default to false, only confirmed utxos are allowed in the transaction
  feeRate: 1, // optional, default to 1 on the testnet, and it is a floating number on the mainnet
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
import { sendBtc, DataSource, NetworkType } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

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
  onlyConfirmedUtxos: false, // optional, default to false, only confirmed utxos are allowed in the transaction
  feeRate: 1, // optional, default to 1 on the testnet, and it is a floating number on the mainnet
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
import { sendUtxos, DataSource, NetworkType } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

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
  changeAddress: account.address, // optional, an address to return change, default to "from"
  onlyConfirmedUtxos: false, // optional, default to false, only confirmed utxos are allowed in the transaction
  feeRate: 1, // optional, default to 1 on the testnet, and it is a floating number on the mainnet
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
import { sendRgbppUtxos, networkTypeToConfig, DataSource, Collector, NetworkType } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

const networkType = NetworkType.TESTNET;
const config = networkTypeToConfig(networkType);

const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
const source = new DataSource(service, networkType);

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
  minUtxoSatoshi: config.btcUtxoDustLimit, // optional, default to 1000 on the testnet, 1,0000 on the mainnet
  rgbppMinUtxoSatoshi: config.rgbppUtxoDustLimit, // optional, default to 546 on both testnet/mainnet
  onlyConfirmedUtxos: false, // optional, default to false, only confirmed utxos are allowed in the transaction
  onlyProvableUtxos: true, // optional, default to true, only utxos that satisfy (utxo.address == from) are allowed 
  feeRate: 1, // optional, default to 1 on the testnet, and it is a floating number on the mainnet
});
```

### Construct a Full-RBF transaction

```typescript
import { sendRbf, networkTypeToConfig, DataSource, Collector, NetworkType } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

const networkType = NetworkType.TESTNET;
const config = networkTypeToConfig(networkType);

const service = BtcAssetsApi.fromToken('btc_assets_api_url', 'your_token');
const source = new DataSource(service, networkType);

const psbt = await sendRbf({
  txHex: 'your_original_transaction_hex',
  from: account.address,
  feeRate: 40, // the feeRate should be greater than the feeRate of the original transaction
  changeIndex: 1, // optional, return change to outputs[changeIndex], will create a new output if not specified
  changeAddress: 'address_to_return_change', // optional, where should the change satoshi be returned to
  requireValidOutputsValue: false, // optional, default to false, require each output's value to be >= minUtxoSatoshi
  requireGreaterFeeAndRate: true, // optional, default to true, require the fee rate&amount to be greater than the original transction
  source,
});
```

## Types

### Transaction

#### sendBtc / createSendBtcBuilder / SendBtcProps

```typescript
declare function sendBtc(props: SendBtcProps): Promise<bitcoin.Psbt>;
```

```typescript
declare function createSendBtcBuilder(props: SendBtcProps): Promise<{
  builder: TxBuilder;
  fee: number;
  feeRate: number;
  changeIndex: number;
}>;
```

```typescript
interface SendBtcProps {
  from: string;
  tos: InitOutput[];
  source: DataSource;
  feeRate?: number;
  fromPubkey?: string;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  onlyConfirmedUtxos?: boolean;
}
```

#### sendUtxos / createSendUtxosBuilder / SendUtxosProps

```typescript
declare function sendUtxos(props: SendUtxosProps): Promise<bitcoin.Psbt>;
```

```typescript
declare function createSendUtxosBuilder(props: SendUtxosProps): Promise<{
  builder: TxBuilder;
  fee: number;
  feeRate: number;
  changeIndex: number;
}>;
```

```typescript
interface SendUtxosProps {
  inputs: Utxo[];
  outputs: InitOutput[];
  source: DataSource;
  from: string;
  feeRate?: number;
  fromPubkey?: string;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  onlyConfirmedUtxos?: boolean;
  excludeUtxos?: BaseOutput[];

  // EXPERIMENTAL: the below props are unstable and can be altered at any time
  skipInputsValidation?: boolean;
}
```

#### sendRgbppUtxos / createSendRgbppUtxosBuilder / SendRgbppUtxosProps

```typescript
declare function sendRgbppUtxos(props: SendRgbppUtxosProps): Promise<bitcoin.Psbt>;
```

```typescript
declare function createSendRgbppUtxosBuilder(props: SendRgbppUtxosProps): Promise<{
  builder: TxBuilder;
  fee: number;
  feeRate: number;
  changeIndex: number;
}>;
```

```typescript
interface SendRgbppUtxosProps {
  ckbVirtualTx: RawTransaction;
  commitment: Hash;
  tos?: string[];
  paymaster?: TxAddressOutput;

  ckbNodeUrl: string;
  rgbppLockCodeHash: Hash;
  rgbppTimeLockCodeHash: Hash;
  rgbppMinUtxoSatoshi?: number;

  source: DataSource;
  from: string;
  feeRate?: number;
  fromPubkey?: string;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  onlyConfirmedUtxos?: boolean;
  excludeUtxos?: BaseOutput[];

  // EXPERIMENTAL: the below props are experimental and can be altered at any time
  onlyProvableUtxos?: boolean;
}
```

#### sendRbf / createSendRbfBuilder / SendRbfProps

```typescript
declare function sendRbf(props: SendRbfProps): Promise<bitcoin.Psbt>;
```

```typescript
declare function createSendRbfBuilder(props: SendRbfProps): Promise<{
  builder: TxBuilder;
  fee: number;
  feeRate: number;
  changeIndex: number;
}>;
```

```typescript
interface SendRbfProps {
  from: string;
  txHex: string;
  source: DataSource;
  feeRate?: number;
  fromPubkey?: string;
  changeIndex?: number;
  changeAddress?: string;
  minUtxoSatoshi?: number;
  onlyConfirmedUtxos?: boolean;
  requireValidOutputsValue?: boolean;
  requireGreaterFeeAndRate?: boolean;

  // EXPERIMENTAL: the below props are experimental and can be altered at any time
  inputsPubkey?: Record<string, string>; // Record<address, pubkey>
}
```

#### InitOutput

```typescript
type InitOutput = TxAddressOutput | TxDataOutput | TxScriptOutput;
```

#### TxAddressOutput / TxDataOutput / TxScriptOutput

```typescript
interface TxAddressOutput extends TxBaseOutput {
  address: string;
}
```

```typescript
interface TxDataOutput extends TxBaseOutput {
  data: Buffer | string;
}
```

```typescript
interface TxScriptOutput extends TxBaseOutput {
  script: Buffer;
}
```

#### TxBaseOutput

```typescript
interface TxBaseOutput {
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
  getUtxo(hex: string, number: number, requireConfirmed?: boolean): Promise<Utxo | undefined>;
  getOutput(hex: string, number: number, requireConfirmed?: boolean): Promise<Output | Utxo | undefined>;
  getUtxos(address: string, params?: BtcAssetsApiUtxoParams): Promise<Utxo[]>;
  collectSatoshi(props: {
    address: string;
    targetAmount: number;
    minUtxoSatoshi?: number;
    allowInsufficient?: boolean;
    onlyNonRgbppUtxos?: boolean;
    onlyConfirmedUtxos?: boolean;
    noAssetsApiCache?: boolean;
    internalCacheKey?: string;
    excludeUtxos?: BaseOutput[];
  }): Promise<{
    utxos: Utxo[];
    satoshi: number;
    exceedSatoshi: number;
  }>;
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

### Basic

#### BaseOutput / Output / Utxo

```typescript
interface BaseOutput {
  txid: string;
  vout: number;
}
```

```typescript
interface Output extends BaseOutput {
  value: number;
  scriptPk: string;
}
```

```typescript
interface Utxo extends Output {
  addressType: AddressType;
  address: string;
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
