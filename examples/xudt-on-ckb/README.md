# xUDT on CKB Examples

The examples for xUDT issuance, mint and transfer on CKB

## How to Start

Copy the `.env.example` file to `.env`:

```shell
cd examples/xudt && cp .env.example .env
```

Update the configuration values:

```yaml
# True for CKB Mainnet and false for CKB Testnet, the default value is false
IS_MAINNET=false

# The CKB secp256k1 private key whose format is 32bytes hex string with 0x prefix
CKB_SECP256K1_PRIVATE_KEY=0x-private-key

# CKB node url which should match IS_MAINNET
CKB_NODE_URL=https://testnet.ckb.dev/rpc

# CKB indexer url which should match IS_MAINNET
CKB_INDEXER_URL=https://testnet.ckb.dev/indexer

```

### Issue xUDT on CKB

```shell
npx ts-node 1-issue-xudt.ts 
```

### Mint/Transfer xUDT on CKB

You can use this command to mint or transfer xUDT assets

```shell
npx ts-node 2-transfer-xudt.ts 
```
