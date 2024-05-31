# RGB++ SDK

This repository offers utilities for Bitcoin and RGB++ asset integration.

### Packages in this repository

- [@rgbpp-sdk/btc](./packages/btc): Bitcoin part of the SDK
- [@rgbpp-sdk/ckb](./packages/ckb): Nervos CKB part of the SDK
- [@rgbpp-sdk/service](./packages/service): Wrapped interfaces of `Bitcoin/RGB++ Assets Service`

## RGB++ Code Examples

- Find code examples at https://github.com/ckb-cell/rgbpp-sdk/tree/develop/examples/rgbpp

## Related CKB Scripts (Contracts)
- [CKB Bitcoin SPV Type Script](https://github.com/ckb-cell/ckb-bitcoin-spv-contracts/tree/master/contracts/ckb-bitcoin-spv-type-lock): A [type script](https://docs.nervos.org/docs/basics/glossary#type-script) for [Bitcoin SPV](https://bitcoinwiki.org/wiki/simplified-payment-verification) clients which synchronize [Bitcoin](https://bitcoin.org) state into [CKB](https://github.com/nervosnetwork/ckb)

- [RgbppLockScript and BtcTimeLockScript](https://github.com/ckb-cell/rgbpp-sdk/blob/63df2dcd95b1b735b5d235e156e4361a3c87b0ac/packages/ckb/src/constants/index.ts#L12-L206)
  * design: https://github.com/ckb-cell/RGBPlusPlus-design/blob/main/docs/light-paper-en.md
  * testnet: https://pudge.explorer.nervos.org/scripts#RGB++
  * mainnet: https://explorer.nervos.org/scripts#RGB++

## RGB++ Asset Workflow Overview

1. **Creation of `rgbpp_ckb_tx_virtual` using [@rgbpp-sdk/ckb](https://github.com/ckb-cell/rgbpp-sdk/tree/develop/packages/ckb)**

  - xUDT

    1. **[BTC → BTC](https://github.com/ckb-cell/rgbpp-sdk/tree/develop/packages/ckb#rgb-xudt-transfer-on-btc)**
    2. **[BTC → CKB](https://github.com/ckb-cell/rgbpp-sdk/tree/develop/packages/ckb#rgb-xudt-leap-from-btc-to-ckb)**
    3. **[CKB → BTC](https://github.com/ckb-cell/rgbpp-sdk/tree/develop/packages/ckb#rgb-xudt-leap-from-ckb-to-btc)** *(isomorphic rgbpp_btc_tx is not required in this workflow)*

  - Spore
  
    1. **[BTC → BTC](https://github.com/ckb-cell/rgbpp-sdk/blob/develop/packages/ckb/README.md#rgb-spore-transfer-on-btc)**
    2. **[BTC → CKB](https://github.com/ckb-cell/rgbpp-sdk/blob/develop/packages/ckb/README.md#rgb-spore-leap-from-btc-to-ckb)**
    3. **[CKB → BTC](https://github.com/ckb-cell/rgbpp-sdk/blob/develop/packages/ckb/README.md#rgb-spore-leap-from-ckb-to-btc)** *(isomorphic rgbpp_btc_tx is not required in this workflow)*

  > [!IMPORTANT]
  > It's recommended to save the `rgbpp_ckb_tx_virtual` locally in case you need it in the future.

2. **Creation of `rgbpp_btc_tx` through [@rgbpp-sdk/btc](https://github.com/ckb-cell/rgbpp-sdk/tree/develop/packages/btc)**
    1. construct isomorphic `rgbpp_btc_tx` based on `rgbpp_ckb_tx_virtual` and rgbpp commitment
    2. sign and broadcast `rgbpp_btc_tx` to obtain `rgbpp_btc_txid`

3. JoyID or dApp sends `rgbpp_btc_txid` and `rgbpp_ckb_tx_virtual` to RGB++ CKB transaction Queue (API Endpoint: `/rgbpp/v1/transaction/ckb-tx`)

4. `RGB++ CKB transaction Queue` will process the following things:
    1. **verify** the received requests
    2. continuously fetch request from the queue through a **cron job**
    3. check whether the **confirmations** of `req.rgbpp_btc_txid` is sufficient
    4. generate the **witnesses for RgbppLocks** in the `rgbpp_ckb_tx_virtual`
    5. add a **paymaster cell** into `rgbpp_ckb_tx_virtual`.inputs if the CKB capacity is insufficient
        1. need to **verify the existence of paymaster UTXO** in the rgbpp_btc_tx
        2. sign the paymaster cell and the entire transaction if needed
    6. **finalize** the `rgbpp_ckb_tx_virtual` to a `rgbpp_ckb_tx`
    7. **broadcast** `rgbpp_ckb_tx` and mark the job as completed upon tx-confirmation

### Notes

- `Bitcoin/RGB++ Assets Service` is designed to streamline the transaction workflow. Developers have the option to implement its features by themselves without limitation.


## FAQ

### How to get an access token of Bitcoin/RGB++ Assets Service?
See [Generate a JSON Web Token (JWT) for Bitcoin/RGB++ Assets Service](./packages/service/README.md#get-an-access-token)

### Where is the error code description for the RgbppLockScript?
See [RGB++ Lock Script Error Codes](https://github.com/nervosnetwork/ckb-script-error-codes/blob/main/by-type-hash/bc6c568a1a0d0a09f6844dc9d74ddb4343c32143ff25f727c59edf4fb72d6936.md)

## License

[ISC](./LICENSE) License
