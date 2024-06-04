import { Module } from '@nestjs/common';
import JsonRpcModule from './json-rpc/json-rpc.module';
import { RgbppModule } from './rgbpp/rgbpp.module';

@Module({
  imports: [
    JsonRpcModule.forRoot({
      path: '/json-rpc',
    }),
    RgbppModule,
  ],
})
export class AppModule {}
