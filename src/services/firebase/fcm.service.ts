import { messaging } from "../../config/firebase";
import logger from "../../utils/logger";

/**
 * Subscribe a single FCM device token to a topic.
 * All topic subscriptions MUST happen only from the backend.
 */
export async function subscribeToTopic(token: string, topic: string): Promise<void> {
  const response = await messaging.subscribeToTopic([token], topic);
  if (response.failureCount > 0) {
    logger.warn(
      `FCM subscribeToTopic: ${response.failureCount} failure(s) for topic "${topic}": ` +
        JSON.stringify(response.errors)
    );
  } else {
    logger.info(`FCM: token subscribed to topic "${topic}"`);
  }
}

/**
 * Unsubscribe a single FCM device token from a topic.
 */
export async function unsubscribeFromTopic(token: string, topic: string): Promise<void> {
  const response = await messaging.unsubscribeFromTopic([token], topic);
  if (response.failureCount > 0) {
    logger.warn(
      `FCM unsubscribeFromTopic: ${response.failureCount} failure(s) for topic "${topic}": ` +
        JSON.stringify(response.errors)
    );
  }
}

/**
 * Send a data-only notification to a FCM topic.
 * Uses data payload so the client app can fully control how it renders.
 */
export async function sendToTopic(
  topic: string,
  data: { body: string; event_id?: string }
): Promise<string> {
  const payload: Record<string, string> = {
    body: data.body,
  };
  if (data.event_id) {
    payload.event_id = data.event_id;
  }

  const messageId = await messaging.send({
    topic,
    data: payload,
  });

  logger.info(`FCM: message sent to topic "${topic}" – messageId: ${messageId}`);
  return messageId;
}

/**
 * Send a data-only notification to multiple device tokens.
 */
export async function sendToTokens(
  tokens: string[],
  data: { title: string; body: string; event_id?: string; type?: string }
): Promise<void> {
  const payload: Record<string, string> = {
    title: data.title,
    body: data.body,
  };
  if (data.event_id) payload.event_id = data.event_id;
  if (data.type) payload.type = data.type;

  const BATCH_SIZE = 500;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        data: payload,
      });

      if (response.failureCount > 0) {
        logger.warn(
          `FCM sendToTokens: ${response.failureCount} failure(s) out of ${batch.length} tokens. Errors: ` +
          JSON.stringify(response.responses.filter(r => !r.success).map(r => r.error))
        );
      }
    } catch (error) {
      logger.error(`FCM sendToTokens error for batch ${i}:`, error);
    }
  }
}


/**
 * Build the FCM topic name for the global (all-users) channel of a wedding.
 */
export function globalTopic(coupleId: string): string {
  return `wedding_${coupleId}_all`;
}

/**
 * Build the FCM topic name for a specific event channel.
 */
export function eventTopic(coupleId: string, eventId: string): string {
  return `wedding_${coupleId}_event_${eventId}`;
}
