import { notificationsQueue } from './queue';
import logger from '../utils/logger';

import pool from '../config/database';

export interface NotificationJobData {
  eventId: string;
  coupleId: string;
  eventName: string;
  type: '1_day_before' | '1_hour_before' | 'at_time';
}

export const removeEventNotifications = async (eventId: string) => {
  const types: NotificationJobData['type'][] = ['1_day_before', '1_hour_before', 'at_time'];
  for (const type of types) {
    const jobId = `${eventId}-${type}`;
    try {
      if (notificationsQueue) {
        await notificationsQueue.remove(jobId);
        logger.info(`[Scheduler] Removed existing job: ${jobId}`);
      }
    } catch (error) {
      logger.error(`[Scheduler] Error removing job ${jobId}:`, error);
    }
  }

  // Clear the sent history so it doesn't get flagged as a duplicate when rescheduled
  try {
    await pool.query(`DELETE FROM notification_logs WHERE event_id = $1`, [eventId]);
    logger.info(`[Scheduler] Cleared notification history for event: ${eventId}`);
  } catch (error) {
    logger.error(`[Scheduler] Error clearing notification history for event ${eventId}:`, error);
  }
};

export const scheduleEventNotifications = async (
  eventId: string,
  coupleId: string,
  eventName: string,
  eventDate: string,
  startTime: string
) => {
  try {
    // First, remove any existing jobs in case this is an update
    await removeEventNotifications(eventId);

    // Combine date and time and add IST offset (+05:30)
    let dateTimeString = `${eventDate}T${startTime.length === 5 ? startTime + ':00' : startTime}`;
    
    // If no timezone is provided, assume IST (+05:30)
    if (!dateTimeString.includes('Z') && !dateTimeString.includes('+')) {
      dateTimeString += '+05:30';
    }
    
    const eventDateTime = new Date(dateTimeString);

    logger.info(`[Scheduler] Calculating schedules for Event: "${eventName}" (${eventId}) at ${dateTimeString}`);

    if (isNaN(eventDateTime.getTime())) {
      logger.error(`[Scheduler] Invalid date/time for event ${eventId}: ${eventDate} ${startTime}`);
      return;
    }

    const now = new Date().getTime();
    const eventTimeMs = eventDateTime.getTime();

    const schedules: { type: NotificationJobData['type']; time: number }[] = [
      { type: '1_day_before', time: eventTimeMs - 24 * 60 * 60 * 1000 },
      { type: '1_hour_before', time: eventTimeMs - 60 * 60 * 1000 },
      { type: 'at_time', time: eventTimeMs },
    ];

    for (const schedule of schedules) {
      const delay = schedule.time - now;

      // Skip if time is already in the past
      if (delay < 0) {
        logger.info(`[Scheduler] Skipping ${schedule.type} - Time already passed by ${Math.abs(Math.round(delay / 1000))} seconds.`);
        continue;
      }

      const jobId = `${eventId}-${schedule.type}`;
      
      if (notificationsQueue) {
        await notificationsQueue.add(
          schedule.type,
          {
            eventId,
            coupleId,
            eventName,
            type: schedule.type,
          },
          {
            delay,
            jobId,
          }
        );
        logger.info(`[Scheduler] Job Queued: "${schedule.type}" for "${eventName}". Executes in: ${Math.round(delay / 1000)}s`);
      } else {
        logger.warn(`[Scheduler] Redis disabled. Skipping queueing for ${schedule.type}`);
      }
    }

  } catch (error) {
    logger.error(`Error scheduling notifications for event ${eventId}:`, error);
  }
};
