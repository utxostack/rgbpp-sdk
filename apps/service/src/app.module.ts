import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import JsonRpcModule from './json-rpc/json-rpc.module';
import { RgbppModule } from './rgbpp/rgbpp.module';
import { AppService } from './app.service';
import { envSchema } from './env';
import { BTCTestnetType, Collector } from 'rgbpp/ckb';
import { BtcAssetsApi } from 'rgbpp';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      validate: envSchema.parse,
    }),
    JsonRpcModule.forRoot({
      path: '/json-rpc',
    }),
    RgbppModule,
  ],
  providers: [
    AppService,
    {
      provide: 'IS_MAINNET',
      useFactory: (configService: ConfigService): boolean => configService.get('NETWORK') === 'mainnet',
      inject: [ConfigService],
    },
    {
      provide: 'BTC_TESTNET_TYPE',
      useFactory: (configService: ConfigService): BTCTestnetType => configService.get('BTC_TESTNET_TYPE'),
      inject: [ConfigService],
    },
    {
      provide: 'COLLECTOR',
      useFactory: (configService: ConfigService) => {
        const ckbRpcUrl = configService.get('CKB_RPC_URL');
        return new Collector({
          ckbIndexerUrl: ckbRpcUrl,
          ckbNodeUrl: ckbRpcUrl,
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'BTC_ASSETS_API',
      useFactory: (configService: ConfigService) => {
        const url = configService.get('BTC_SERVICE_URL');
        const token = configService.get('BTC_SERVICE_TOKEN');
        const origin = configService.get('BTC_SERVICE_ORIGIN');
        return BtcAssetsApi.fromToken(url, token, origin);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['IS_MAINNET', 'COLLECTOR', 'BTC_ASSETS_API', 'BTC_TESTNET_TYPE'],
})
export class AppModule {}
