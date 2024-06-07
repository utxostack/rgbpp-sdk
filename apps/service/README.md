# RGB++ SDK Service


## Quick Start

### Clone rgbpp-sdk repository

```shell
git clone https://github.com/ckb-cell/rgbpp-sdk.git
cd apps/service
```

### Update Environment Variables

Copy the `.env.example` file to `.env`:

```shell
cp .env.example .env
```

Update the configuration values:

```yml
# testnet for CKB and BTC Testnet and mainnet for CKB and BTC Mainnet, the default value is testnet
NETWORK=testnet

# CKB node url which should be matched with NETWORK
CKB_RPC_URL=https://testnet.ckb.dev

# The BTC assets api url which should be matched with NETWORK
BTC_SERVICE_URL=https://btc-assets-api.testnet.mibao.pro

# The BTC assets api token which should be matched with IS_MAINNET
# To get an access token, please refer to https://github.com/ckb-cell/rgbpp-sdk/tree/develop/packages/service#get-an-access-token
BTC_SERVICE_TOKEN=

# The BTC assets api origin which should be matched with IS_MAINNET
BTC_SERVICE_ORIGIN=https://btc-assets-api.testnet.mibao.pro
```

### Run RGB++ SDK Service

```shell
pnpm install && pnpm dev
```