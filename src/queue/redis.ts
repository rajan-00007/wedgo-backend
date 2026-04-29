import { Redis } from 'ioredis';
import logger from '../utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Force load .env from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

export const redisConnection = new Redis(redisConfig);

redisConnection.on('error', (err) => {
  logger.error(`Redis connection error: ${err}`);
});

redisConnection.on('connect', () => {
  logger.info('Connected to Redis successfully');
});
