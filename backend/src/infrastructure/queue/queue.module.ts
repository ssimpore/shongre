import { Global, Module } from "@nestjs/common";
import {
  RedisHealthService,
  redisHealthService,
} from "./redis-health.service.js";
import {
  BackgroundJobDispatcher,
  backgroundJobDispatcher,
} from "./background-job-dispatcher.js";

@Global()
@Module({
  providers: [
    { provide: RedisHealthService, useValue: redisHealthService },
    { provide: BackgroundJobDispatcher, useValue: backgroundJobDispatcher },
  ],
  exports: [RedisHealthService, BackgroundJobDispatcher],
})
export class QueueModule {}
