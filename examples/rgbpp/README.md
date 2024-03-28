# RGB++ Examples

**All examples are just to demonstrate the use of RGB++ SDK. SPV proof is not ready yet, so these examples do not involve the verification of SPV proof.**

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

## Examples with Queue service(Recommended)

### Mint XUDT
As a simple example, Omiga protocol is reused for a quick demonstration of XUDT asset insurance.
Developers have the option to utilize an existing XUDT (User-Defined Token) on CKB.

```shell
npx ts-node examples/rgbpp/queue/1-mint-xudt.ts 
```

### Jump XUDT from CKB to BTC

```shell
npx ts-node examples/rgbpp/queue/2-ckb-jump-btc.ts 
```

### Transfer RGB++ asset on BTC

```shell
npx ts-node examples/rgbpp/queue/3-btc-transfer.ts 
```

### Jump RGB++ asset from BTC to CKB

```shell
npx ts-node examples/rgbpp/queue/4-btc-jump-ckb.ts 
```

### Unlock BTC time cells on CKB

**Warning: Wait at least 6 BTC confirmation blocks to unlock the BTC time cells after 4-btc-jump-ckb.ts**

```shell
npx ts-node examples/rgbpp/queue/5-spend-btc-time-cell.ts 
```

## Local Examples

### Mint XUDT
As a simple example, Omiga protocol is reused for a quick demonstration of XUDT asset insurance.
Developers have the option to utilize an existing XUDT (User-Defined Token) on CKB.

```shell
npx ts-node examples/rgbpp/local/1-mint-xudt.ts 
```

### Jump XUDT from CKB to BTC

```shell
npx ts-node examples/rgbpp/local/2-ckb-jump-btc.ts 
```

### Transfer RGB++ asset on BTC

```shell
npx ts-node examples/rgbpp/local/3-btc-transfer.ts 
```

### Jump RGB++ asset from BTC to CKB

```shell
npx ts-node examples/rgbpp/local/4-btc-jump-ckb.ts 
```

### Unlock BTC time cells on CKB

**Warning: Wait at least 6 BTC confirmation blocks to unlock the BTC time cells after 4-btc-jump-ckb.ts**

```shell
npx ts-node examples/rgbpp/local/5-spend-btc-time-cell.ts 
```