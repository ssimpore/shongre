import { Global, Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway.js";
import { RealtimePubSub, realtimePubSub } from "./realtime-pub-sub.js";

@Global()
@Module({
  providers: [
    { provide: RealtimePubSub, useValue: realtimePubSub },
    RealtimeGateway,
  ],
  exports: [RealtimePubSub],
})
export class RealtimeModule {}
