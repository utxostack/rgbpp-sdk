## RGBPP Examples

**All examples are just to demonstrate the use of RGBPP SDK. SPV proof is not ready yet, so these examples do not involve the verification of SPV proof.**

### Mint XUDT： To simplify, we reuse the Omiga protocol to quickly issue XUDT assets on CKB

```shell
npx ts-node examples/rgbpp/src/1-mint-xudt.ts 
```

### Jump XUDT from CKB to BTC

```shell
npx ts-node examples/rgbpp/src/2-ckb-jump-btc.ts 
```

### Transfer RGBPP asset on BTC

```shell
npx ts-node examples/rgbpp/src/3-btc-transfer.ts 
```

### Jump RGBPP asset from BTC to CKB

```shell
npx ts-node examples/rgbpp/src/4-btc-jump-ckb.ts 
```

### Unlock BTC time cells on CKB

**Warning: Wait at least 6 BTC confirmation blocks to unlock the BTC time cells after 4-btc-jump-ckb.ts**

```shell
npx ts-node examples/rgbpp/src/5-spend-btc-time-cell.ts 
```
