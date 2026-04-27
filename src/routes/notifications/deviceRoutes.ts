import { Router } from "express";
import { registerDevice } from "../../controllers/notifications/deviceController";

const router = Router();

/**
 * POST /api/devices/register
 * Register a FCM device token and subscribe it to the correct topics.
 */
router.post("/register", registerDevice);

export default router;
