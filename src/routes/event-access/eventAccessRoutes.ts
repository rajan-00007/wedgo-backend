import { Router } from "express";
import * as eventAccessController from "../../controllers/event-access/eventAccessController";
import { authenticateToken } from "../../middlewares/auth/authMiddleware";

const router = Router();

router.post("/generate-full-access", authenticateToken, eventAccessController.generateFullAccess);
router.post("/generate-custom-access", authenticateToken, eventAccessController.generateCustomAccess);
router.get("/event", eventAccessController.getEventsByToken);

export default router;
