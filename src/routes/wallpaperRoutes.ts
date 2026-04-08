import { Router } from "express";
import wallpaperController from "../controllers/wallpaperController";

const router = Router();

// Publicly accessible presets or protected, usually getting presets can be publicly available
// since it's just app assets, but you can add authenticateToken if needed.
router.get("/presets", (req, res) => wallpaperController.getPresets(req, res));

export default router;
