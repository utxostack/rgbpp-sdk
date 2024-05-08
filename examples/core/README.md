# RGB++ Examples

**All examples are just to demonstrate the use of RGB++ SDK.**

- Local and Queue directories: The examples for RGB++ UDT issuance, transfer, and leap
- Spore directory: The examples for RGB++ spore creation, transfer and leap

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

## RGB++ xUDT Examples with Queue service(Recommended)

### Leap xUDT from CKB to BTC

```shell
npx ts-node examples/rgbpp/queue/1-ckb-jump-btc.ts 
```

### Transfer RGB++ xUDT on BTC

```shell
npx ts-node examples/rgbpp/queue/2-btc-transfer.ts 
```

### Leap RGB++ xUDT from BTC to CKB

```shell
npx ts-node examples/rgbpp/queue/3-btc-jump-ckb.ts 
```

### Unlock xUDT BTC time cells on CKB

A cron job in RGB++ Queue service will construct a transaction unlocking the mature BTC time cells to the their `target_ckb_address`.


## RGB++ xUDT Local Examples

### Leap RGB++ xUDT from CKB to BTC

```shell
npx ts-node examples/rgbpp/local/1-ckb-jump-btc.ts 
```

### Transfer RGB++ xUDT on BTC

```shell
npx ts-node examples/rgbpp/local/2-btc-transfer.ts 
```

### Leap RGB++ xUDT from BTC to CKB

```shell
npx ts-node examples/rgbpp/local/3-btc-jump-ckb.ts 
```

### Unlock xUDT BTC time cells on CKB

**Warning: Wait at least 6 BTC confirmation blocks to unlock the BTC time cells after 4-btc-jump-ckb.ts**

```shell
npx ts-node examples/rgbpp/local/4-spend-btc-time-cell.ts 
```

## RGB++ Spore Examples

**You can use RGB++ Queue service to complete spore transfer and leap, and the examples can be found in `examples/rgbpp/spore/queue`**

### Create RGB++ Cluster Cell

```shell
npx ts-node examples/rgbpp/spore/1-prepare-cluster.ts

npx ts-node examples/rgbpp/spore/2-create-cluster.ts
```

### Create RGB++ Spores with Cluster on BTC

```shell
npx ts-node examples/rgbpp/spore/3-create-spores.ts
```

### Transfer RGB++ Spore on BTC

```shell
npx ts-node examples/rgbpp/spore/4-transfer-spore.ts
```

### Leap RGB++ Spore from BTC to CKB

```shell
npx ts-node examples/rgbpp/spore/5-leap-spore-to-ckb.ts
```

### Unlock Spore BTC time cells on CKB

A cron job in RGB++ Queue service will construct a transaction unlocking the mature BTC time cells to the their `target_ckb_address`.

However, you can still manually unlock the spore btc time cell through the following command

**Warning: Wait at least 6 BTC confirmation blocks to unlock the BTC time cells after 5-leap-spore-to-ckb.ts**

```shell
npx ts-node examples/rgbpp/spore/6-unlock-btc-time-cell.ts
```

### Leap Spore from CKB to BTC

```shell
npx ts-node examples/rgbpp/spore/7-leap-spore-to-btc.ts
```