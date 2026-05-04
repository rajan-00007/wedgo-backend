import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const NOTIFICATIONS_QUEUE_NAME = 'notifications';

export const notificationsQueue = redisConnection ? new Queue(NOTIFICATIONS_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
}) : null as any;
