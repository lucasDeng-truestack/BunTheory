import { Module } from '@nestjs/common';
import { PosRealtimeGateway } from './pos-realtime.gateway';

@Module({
  providers: [PosRealtimeGateway],
  exports: [PosRealtimeGateway],
})
export class PosRealtimeModule {}
