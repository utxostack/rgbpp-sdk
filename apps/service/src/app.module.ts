import { Module } from '@nestjs/common';
import JsonRpcModule from './json-rpc/json-rpc.module';
import { RgbppModule } from './rgbpp/rgbpp.module';
import { AppService } from './app.service';

@Module({
  imports: [
    JsonRpcModule.forRoot({
      path: '/json-rpc',
    }),
    RgbppModule,
  ],
  providers: [AppService],
})
export class AppModule {}
