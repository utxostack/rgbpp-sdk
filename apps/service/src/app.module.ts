import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import JsonRpcModule from './json-rpc/json-rpc.module';
import { RgbppModule } from './rgbpp/rgbpp.module';
import { AppService } from './app.service';
import { envSchema } from './env';
import { Collector } from 'rgbpp/ckb';

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
  ],
})
export class AppModule {}
