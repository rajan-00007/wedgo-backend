import { Router } from "express";
import * as eventAccessController from "../../controllers/event-access/eventAccessController";
import * as eventEntriesController from "../../controllers/events/eventEntriesController";
import { authenticateToken } from "../../middlewares/auth/authMiddleware";

const router = Router();

router.get("/generate-full-access", authenticateToken, eventAccessController.generateFullAccess);
router.post("/generate-custom-access", authenticateToken, eventAccessController.generateCustomAccess);
router.get("/event/welcome", eventAccessController.getWelcomeDataByToken);
router.get("/event/og-meta", eventAccessController.getOgMetaByToken); // Public — for WhatsApp/OG link previews
router.get("/event", eventAccessController.getEventsByToken);

// Record an entry when a user scans QR/opens event link
router.post("/event/entry", eventEntriesController.recordEntry);

// NEW: Admin statistics routes
router.get("/event/entries/stats", authenticateToken, eventEntriesController.getEntryStats);
router.get("/event/entries/:coupleId/count", authenticateToken, eventEntriesController.getCoupleEntryCount);

export default router;
