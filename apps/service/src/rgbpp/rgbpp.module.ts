import { Module } from '@nestjs/common';
import { RgbppService } from './rgbpp.service';

@Module({
  imports: [],
  providers: [RgbppService],
})
export class RgbppModule {}
