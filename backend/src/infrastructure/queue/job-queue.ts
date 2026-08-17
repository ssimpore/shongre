import { logger } from '../logging/logger.js';

export type JobHandler<T = any> = (data: T) => Promise<void>;

export class JobQueue {
  private handlers = new Map<string, JobHandler>();

  registerHandler<T>(name: string, handler: JobHandler<T>): void {
    this.handlers.set(name, handler);
  }

  async enqueue<T>(name: string, data: T): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) {
      logger.warn(`No handler registered for queue job: ${name}`);
      return;
    }

    // Run asynchronously without blocking caller
    setImmediate(async () => {
      try {
        await handler(data);
        logger.debug(`Job ${name} executed successfully`);
      } catch (err: any) {
        logger.error(`Job ${name} failed: ${err.message}`, { error: err });
      }
    });
  }
}

export const jobQueue = new JobQueue();
