import { Request, Response } from "express";
import { registerDeviceSchema } from "../../validators/notifications/notificationValidators";
import notificationRepository from "../../repositories/notifications/notificationRepository";
import {
  subscribeToTopic,
  globalTopic,
  eventTopic,
} from "../../services/firebase/fcm.service";
import logger from "../../utils/logger";

/**
 * POST /api/devices/register
 *
 * Body: { token, couple_id, access_token, platform }
 *
 * 1. Validates the access_token against event_access for the given couple.
 * 2. Resolves the allowed event_ids.
 * 3. Upserts the device token row.
 * 4. Subscribes the token to:
 *    - wedding_{coupleId}_all  (always)
 *    - wedding_{coupleId}_event_{eventId}  (per allowed event)
 */
export const registerDevice = async (req: Request, res: Response) => {
  //  1. Validate input 
  const parsed = registerDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { token, couple_id, access_token, platform } = parsed.data;

  try {
    //  2. Validate access_token 
    const access = await notificationRepository.findAccessByToken(access_token, couple_id);
    if (!access) {
      return res.status(403).json({ error: "Invalid or unauthorised access_token" });
    }

    // Check expiry (if set)
    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return res.status(403).json({ error: "access_token has expired" });
    }

    //  3. Resolve allowed event_ids 
    let allowedEventIds: string[];
    if (access.access_type === "all") {
      allowedEventIds = await notificationRepository.getAllEventIdsByCoupleId(couple_id);
    } else {
      allowedEventIds = await notificationRepository.getAllowedEventIds(access.id);
    }

    //  4. Upsert token in DB 
    await notificationRepository.upsertDeviceToken({ couple_id, token, platform, access_token });

    //  5. Subscribe to topics 
    // Always subscribe to global topic first
    await subscribeToTopic(token, globalTopic(couple_id));

    // Subscribe to each allowed event topic
    const eventSubscriptions = allowedEventIds.map((eventId) =>
      subscribeToTopic(token, eventTopic(couple_id, eventId))
    );
    await Promise.all(eventSubscriptions);

    logger.info(
      `Device registered: couple=${couple_id}, platform=${platform}, events=${allowedEventIds.length}`
    );

    return res.status(200).json({
      message: "Device registered and subscribed successfully",
      subscribed_to: {
        global_topic: globalTopic(couple_id),
        event_topics: allowedEventIds.map((id) => eventTopic(couple_id, id)),
      },
    });
  } catch (error) {
    logger.error("Error registering device:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
