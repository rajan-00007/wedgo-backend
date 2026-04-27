import { Router } from "express";
import { sendNotification, getNotifications, updateNotification, deleteNotification } from "../../controllers/notifications/notificationsController";
import { authenticateToken } from "../../middlewares/auth/authMiddleware";

const router = Router();

/**
 * POST /api/notifications/send
 * Send a global or event-specific notification via FCM.
 */
router.post("/send", authenticateToken, sendNotification);

/**
 * GET /api/notifications
 * Fetch notification history for a couple.
 */
router.get("/", getNotifications);

/**
 * PATCH /api/notifications/:id
 * Update a notification message.
 */
router.patch("/:id", authenticateToken, updateNotification);

/**
 * DELETE /api/notifications/:id
 * Delete a notification record.
 */
router.delete("/:id", authenticateToken, deleteNotification);

export default router;
