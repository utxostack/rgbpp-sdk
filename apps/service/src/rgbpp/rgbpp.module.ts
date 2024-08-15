import { Module } from '@nestjs/common';
import { RgbppService } from './rgbpp.service.js';

@Module({
  imports: [],
  providers: [RgbppService],
})
export class RgbppModule {}
