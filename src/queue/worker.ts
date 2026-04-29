import { Worker, Job } from 'bullmq';
import { redisConnection } from './redis';
import { NOTIFICATIONS_QUEUE_NAME } from './queue';
import { NotificationJobData } from './scheduler';
import pool from '../config/database';
import { sendToTokens } from '../services/firebase/fcm.service';
import logger from '../utils/logger';

const processNotificationJob = async (job: Job<NotificationJobData>) => {
  const { eventId, coupleId, eventName, type } = job.data;
  
  logger.info(`[Worker] Starting Job: ${job.id} | Event: "${eventName}" | Type: ${type}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if already sent
    const checkLog = await client.query(
      `SELECT id FROM notification_logs WHERE event_id = $1 AND type = $2 FOR UPDATE SKIP LOCKED`,
      [eventId, type]
    );

    if (checkLog.rows.length > 0) {
      logger.warn(`[Worker] Duplicate detected! Notification for "${eventName}" (${type}) already sent. Skipping.`);
      await client.query('COMMIT');
      return;
    }

    // 2. Determine eligible users
    logger.info(`[Worker] Fetching target device tokens for Event ID: ${eventId}`);
    const tokenResult = await client.query(
      `SELECT DISTINCT udt.token
       FROM user_device_tokens udt
       LEFT JOIN event_access ea ON udt.access_token = ea.token AND ea.couple_id = udt.couple_id
       LEFT JOIN event_access_events eae ON ea.id = eae.access_id
       WHERE udt.couple_id = $1
         AND (
           udt.access_token IS NULL
           OR ea.access_type = 'all'
           OR eae.event_id = $2
         )`,
      [coupleId, eventId]
    );

    const tokens = tokenResult.rows.map((row) => row.token);
    logger.info(`[Worker] Found ${tokens.length} eligible device(s).`);

    if (tokens.length === 0) {
      logger.info(`[Worker] No devices to notify for "${eventName}". Task complete.`);
    } else {
      // 3. Formulate message
      let messageBody = '';
      if (type === '1_day_before') {
        messageBody = `Event ${eventName} is tomorrow \uD83C\uDF89`;
      } else if (type === '1_hour_before') {
        messageBody = `${eventName} starts in 1 hour!`;
      } else if (type === 'at_time') {
        messageBody = `${eventName} is starting now!`;
      }

      logger.info(`[Worker] Sending FCM Multicast. Message: "${messageBody}"`);

      // 4. Send via FCM
      await sendToTokens(tokens, {
        title: eventName,
        body: messageBody,
        event_id: eventId,
        type: 'event_reminder',
      });

      logger.info(`[Worker] Recording notification in history table...`);

      // 5. Store in notifications table for history
      await client.query(
        `INSERT INTO notifications (couple_id, event_id, message) VALUES ($1, $2, $3)`,
        [coupleId, eventId, messageBody]
      );
    }

    // 6. Log success to prevent duplicates
    await client.query(
      `INSERT INTO notification_logs (event_id, type) VALUES ($1, $2)`,
      [eventId, type]
    );

    await client.query('COMMIT');
    logger.info(`[Worker] Job Successfully Completed: ${job.id}`);
  } catch (error) {

    await client.query('ROLLBACK');
    logger.error(`Failed to process job ${job.id}:`, error);
    throw error; // Let BullMQ retry
  } finally {
    client.release();
  }
};

export const notificationsWorker = new Worker(
  NOTIFICATIONS_QUEUE_NAME,
  processNotificationJob,
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

notificationsWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} has completed!`);
});

notificationsWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} has failed with ${err.message}`);
});
