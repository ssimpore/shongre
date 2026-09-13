import { Global, Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway.js";
import { RealtimePubSub, realtimePubSub } from "./realtime-pub-sub.js";
import { presenceStore } from "./presence-store.js";

@Global()
@Module({
  providers: [
    { provide: "PRESENCE_STORE", useValue: presenceStore },
    { provide: RealtimePubSub, useValue: realtimePubSub },
    RealtimeGateway,
  ],
  exports: [RealtimePubSub],
})
export class RealtimeModule {}
