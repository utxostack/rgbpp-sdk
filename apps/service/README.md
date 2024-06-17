# RGB++ SDK Service

A RPC service for Wrapping essential RGB++ Assets Operations(**only support RGB++ Transfer on BTC now**) with [rgbpp-sdk](https://github.com/ckb-cell/rgbpp-sdk) for other programming languages to quickly manage RGB++ Assets.

## Quick Start

### Clone rgbpp-sdk repository

```shell
$ git clone https://github.com/ckb-cell/rgbpp-sdk.git
$ pnpm install
$ cd apps/service
```

### Update Environment Variables

Copy the `.env.example` file to `.env`:

```shell
$ cp .env.example .env
```

Update the configuration values:

```yml
# The network includes testnet and mainnet, the default value is testnet
NETWORK=testnet  # or mainnet

# The Bitcoin Testnet type includs Testnet3 and Signet, the default value is Signet
# Testnet3: https://mempool.space/testnet
# Signet: https://mempool.space/signet
BTC_TESTNET_TYPE=Signet

# CKB node url which should match NETWORK
CKB_RPC_URL=https://testnet.ckb.dev

# The BTC assets api url which should match NETWORK and BTC_TESTNET_TYPE
# The BTC Testnet Service url is: https://api.testnet.rgbpp.io
# The BTC Signet Service url is: https://api.signet.rgbpp.io
BTC_SERVICE_URL=hhttps://api.signet.rgbpp.io

# The BTC assets api token which should match NETWORK and BTC_TESTNET_TYPE
# To get an access token, please refer to https://github.com/ckb-cell/rgbpp-sdk/tree/develop/packages/service#get-an-access-token
BTC_SERVICE_TOKEN=

# The BTC assets api origin which should match NETWORK and BTC_TESTNET_TYPE
BTC_SERVICE_ORIGIN=https://btc-test.app
```

### Run RGB++ SDK Service

```shell
# Debug environment
$ pnpm start:dev

# Production environment
$ pnpm start:prod
```

## Deploy and Manage RGB++ SDK Service

### 1. Use a process manager like PM2

- Install PM2

```shell
$ npm install -g pm2
```

- Start RGB++ SDK Service with PM2

```
$ pm2 start dist/src/main.js --name rgbpp-sdk-service
```

### 2. Use Docker

- Copy the `.env.example` file to `.env` and Update the configuration values

- Use the provided `docker-compose.yml` file to run the service:

```bash
$ docker-compose up
```

### 3. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fckb-cell%2Frgbpp-sdk%2Ftree%2Fmain%2Fapps%2Fservice&env=NETWORK,CKB_RPC_URL,BTC_SERVICE_URL,BTC_SERVICE_TOKEN,BTC_SERVICE_ORIGIN&project-name=rgbpp-sdk-service&repository-name=rgbpp-sdk)
