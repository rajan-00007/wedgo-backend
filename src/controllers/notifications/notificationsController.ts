import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/auth/authMiddleware";
import { sendNotificationSchema } from "../../validators/notifications/notificationValidators";
import notificationRepository from "../../repositories/notifications/notificationRepository";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import {
  sendToTopic,
  globalTopic,
  eventTopic,
} from "../../services/firebase/fcm.service";
import logger from "../../utils/logger";

/**
 * Helper to get couple_id for the authenticated user
 */
const getCoupleIdFromUser = async (userId: string): Promise<string | null> => {
  const profile = await coupleProfileRepository.findByUserId(userId);
  return profile ? profile.id : null;
};

/**
 * POST /api/notifications/send
 *
 * Body (global):
 *   { type: "global", title, message }
 *
 * Body (event):
 *   { type: "event", event_id, title, message }
 *
 * 1. Validates input via Zod discriminated union.
 * 2. For "event" type: verifies event belongs to couple.
 * 3. Saves notification row in DB.
 * 4. Sends via FCM topic.
 */
export const sendNotification = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const coupleId = await getCoupleIdFromUser(req.user.id);
  if (!coupleId) return res.status(404).json({ error: "Couple profile not found" });

  // 1. Validate input
  const parsed = sendNotificationSchema.safeParse({ ...req.body, couple_id: coupleId });
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const input = parsed.data;

  try {
    if (input.type === "event") {
      // 2. Verify event belongs to couple
      const belongs = await notificationRepository.eventBelongsToCouple(
        input.event_id,
        coupleId
      );
      if (!belongs) {
        return res.status(404).json({
          error: "Event not found or does not belong to this couple",
        });
      }
    }

    // 3. Persist notification to DB
    const notification = await notificationRepository.createNotification({
      couple_id: coupleId,
      event_id: input.type === "event" ? input.event_id : null,
      message: input.message,
    });

    // 4. Build FCM topic & send
    const topic =
      input.type === "global"
        ? globalTopic(coupleId)
        : eventTopic(coupleId, input.type === "event" ? input.event_id : "");

    const fcmPayload = {
      body: input.message,
      ...(input.type === "event" && { event_id: input.event_id }),
    };

    const messageId = await sendToTopic(topic, fcmPayload);

    logger.info(
      `Notification sent: type=${input.type}, couple=${coupleId}, messageId=${messageId}`
    );

    return res.status(200).json({
      message: "Notification sent successfully",
      notification_id: notification.id,
      fcm_message_id: messageId,
      topic,
    });
  } catch (error) {
    logger.error("Error sending notification:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/notifications
 *
 * Returns notification history for a couple (newest first).
 * Accessible by both Admins and Guest users.
 */
export const getNotifications = async (req: Request, res: Response) => {
  // Check for coupleId in query (standard for GET) or body
  const coupleId = (req.query.coupleId as string) || req.body.coupleId;
  const token = req.query.token as string; // From guest frontend

  if (!coupleId) {
    return res.status(400).json({ error: "coupleId is required" });
  }

  try {
    let notifications;
    if (token) {
      // It's a guest request
      const access = await notificationRepository.findAccessByToken(token, coupleId);
      if (!access) {
        return res.status(401).json({ error: "Invalid guest token" });
      }
      
      if (access.access_type === 'all') {
        notifications = await notificationRepository.getNotificationsForGuest(coupleId, 'all');
      } else {
        const allowedEventIds = await notificationRepository.getAllowedEventIds(access.id);
        notifications = await notificationRepository.getNotificationsForGuest(coupleId, allowedEventIds);
      }
    } else {
      // Admin dashboard request (no token query param passed)
      notifications = await notificationRepository.getNotificationsByCoupleId(coupleId);
    }

    return res.status(200).json(notifications);
  } catch (error) {
    logger.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PATCH /api/notifications/:id
 * Update an existing notification message.
 */
export const updateNotification = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const coupleId = await getCoupleIdFromUser(req.user.id);
  if (!coupleId) return res.status(404).json({ error: "Couple profile not found" });

  try {
    const updated = await notificationRepository.updateNotification(id as string, coupleId, message);
    if (!updated) {
      return res.status(404).json({ error: "Notification not found or access denied" });
    }

    return res.status(200).json({
      message: "Notification updated successfully",
      notification: updated
    });
  } catch (error) {
    logger.error("Error updating notification:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification record.
 */
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;

  const coupleId = await getCoupleIdFromUser(req.user.id); 
  if (!coupleId) return res.status(404).json({ error: "Couple profile not found" });

  try {
    const deleted = await notificationRepository.deleteNotification(id as string, coupleId);
    if (!deleted) {
      return res.status(404).json({ error: "Notification not found or access denied" });
    }

    return res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    logger.error("Error deleting notification:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

