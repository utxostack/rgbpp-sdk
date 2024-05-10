# RGB++ Examples

- xUDT directory: The examples for RGB++ UDT issuance, transfer, and leap
- Spore directory: The examples for RGB++ Spore creation, transfer and leap

## How to Start

Copy the `.env.example` file to `.env`:

```shell
cd examples/rgbpp && cp .env.example .env
```

Update the configuration values:

```yaml
# Ture for CKB and BTC Mainnet and false for CKB and BTC Testnet, the default value is false
IS_MAINNET=false

# CKB Variables

# The CKB secp256k1 private key whose format is 32bytes hex string with 0x prefix
CKB_SECP256K1_PRIVATE_KEY=0x-private-key

# CKB node url which should be matched with IS_MAINNET
CKB_NODE_URL=https://testnet.ckb.dev/rpc

# CKB indexer url which should be matched with IS_MAINNET
CKB_INDEXER_URL=https://testnet.ckb.dev/indexer

# BTC Variables

# The BTC private key whose format is 32bytes hex string without 0x prefix
BTC_PRIVATE_KEY=private-key

# The BTC assets api url which should be matched with IS_MAINNET
BTC_ASSETS_API_URL=https://btc-assets-api.testnet.mibao.pro;

# The BTC assets api token which should be matched with IS_MAINNET
BTC_ASSETS_TOKEN=;

# The BTC assets api origin which should be matched with IS_MAINNET
BTC_ASSETS_ORIGIN=https://btc-test.app;
```


## RGB++ xUDT Examples

### RGB++ xUDT Launch on BTC

### 1. Prepare Launch

```shell
npx ts-node xudt/launch/1-prepare-launch.ts
```
### 2. Launch RGB++ xUDT on BTC

```shell
npx ts-node xudt/launch/2-launch-rgbpp.ts
```
### 3. Distribute RGB++ xUDT on BTC

```shell
npx ts-node xudt/launch/3-distribute-rgbpp.ts
```

### RGB++ xUDT Transfer and Leap

#### 1. Leap xUDT from CKB to BTC

```shell
npx ts-node xudt/1-ckb-leap-btc.ts 
```

#### 2. Transfer RGB++ xUDT on BTC with Queue Service

```shell
npx ts-node xudt/2-btc-transfer.ts 
```

#### 3. Leap RGB++ xUDT from BTC to CKB with Queue Service

```shell
npx ts-node xudt/3-btc-leap-ckb.ts 
```

#### 4. Unlock xUDT BTC time cells on CKB

A cron job in RGB++ Queue service will construct a transaction unlocking the mature BTC time cells to the their `target_ckb_address`.

However, you can still manually unlock the spore BTC time cell through the following command

Warning: Wait at least 6 BTC confirmation blocks to unlock the BTC time cells after 3-btc-leap-ckb.ts

```shell
npx ts-node xudt/launch/4-unlock-btc-time.ts 
```

## RGB++ Spore Examples

### RGB++ Spores Launch on BTC

#### 1. Create RGB++ Cluster Cell

```shell
npx ts-node spore/launch/1-prepare-cluster.ts

npx ts-node spore/launch/2-create-cluster.ts
```

#### 2. Create RGB++ Spores with Cluster on BTC

```shell
npx ts-node spore/launch/3-create-spores.ts
```

### Transfer and Leap Spore

#### 1. Transfer RGB++ Spore on BTC with Queue Service

```shell
npx ts-node spore/4-transfer-spore.ts
```

#### 2. Leap RGB++ Spore from BTC to CKB

```shell
npx ts-node spore/5-leap-spore-to-ckb.ts
```

#### 3. Unlock Spore BTC time cells on CKB

A cron job in RGB++ Queue service will construct a transaction unlocking the mature BTC time cells to the their `target_ckb_address`.

However, you can still manually unlock the spore BTC time cell through the following command

**Warning: Wait at least 6 BTC confirmation blocks to unlock the BTC time cells after 5-leap-spore-to-ckb.ts**

```shell
npx ts-node spore/6-unlock-btc-time-cell.ts
```

#### 4. Leap Spore from CKB to BTC

```shell
npx ts-node spore/7-leap-spore-to-btc.ts
```

## What you must know about BTC transaction id

**The BTC transaction id(hash) displayed on BTC explorer is different from the BTC transaction id(hash) in RGB++ lock args. They are in reverse byte order.**

We follow the following two rules： 

- Whenever you're working with transaction/block hashes **internally** (e.g. inside raw bitcoin data), you use the **natural** byte order.
- Whenever you're **displaying or searching** for transaction/block hashes, you use the **reverse** byte order.

For detailed rules, please refer to [Byte Order](https://learnmeabitcoin.com/technical/general/byte-order/)

For example, the BTC transaction id(hash) of the RGB++ lock args like this: 

```
4abc778213bc4da692f93745c2b07410ef2bfaee70417784d4ee8969fb258001
```

But when you're searching for this transaction in [Bitcoin Core](https://bitcoin.org/en/bitcoin-core/) or on a block explorer, you'll see this byte order:

```
018025fb6989eed484774170eefa2bef1074b0c24537f992a64dbc138277bc4a
```
