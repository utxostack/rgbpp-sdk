import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import JsonRpcModule from './json-rpc/json-rpc.module';
import { RgbppModule } from './rgbpp/rgbpp.module';
import { AppService } from './app.service';
import { envSchema } from './env';
import { Collector } from 'rgbpp/ckb';
import { BtcAssetsApi, DataSource, NetworkType } from 'rgbpp';

const parseNetwork = (configService: ConfigService): boolean => configService.get('NETWORK') === 'mainnet';

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
      useFactory: parseNetwork,
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
      provide: 'BTC_DATA_SOURCE',
      useFactory: (configService: ConfigService) => {
        const url = configService.get('BTC_SERVICE_URL');
        const token = configService.get('BTC_SERVICE_TOKEN');
        const origin = configService.get('BTC_SERVICE_ORIGIN');
        const btcAssestApi = BtcAssetsApi.fromToken(url, token, origin);
        const networkType = parseNetwork(configService) ? NetworkType.MAINNET : NetworkType.TESTNET;
        const dataSource = new DataSource(btcAssestApi, networkType);
        return dataSource;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['IS_MAINNET', 'COLLECTOR', 'BTC_DATA_SOURCE'],
})
export class AppModule {}
