import { Router } from "express";
import profileController from "../controllers/profileController";
import { authenticateToken } from "../middlewares/auth/authMiddleware";
import { upload } from "../middlewares/multer/upload";

const router = Router();

// Protected route to update/create profile
router.post("/update-profile", authenticateToken, (req, res) => profileController.upsertProfile(req, res));

// Protected route to get own profile
router.get("/get-profile", authenticateToken, (req, res) => profileController.getProfile(req, res));

// Protected route to set preset wallpaper
router.post("/preset-wallpaper", authenticateToken, (req, res) => profileController.updatePresetWallpaper(req, res));

// Protected route to upload custom wallpaper
router.post("/custom-wallpaper", authenticateToken, upload.array("wallpapers", 3), (req, res) => profileController.uploadCustomWallpaper(req, res));

// Public route to get profile stats
router.get("/stats/:coupleId", (req, res) => profileController.getProfileStats(req, res));

// Public route to get hero page data (wallpapers & time block)
router.get("/hero/:coupleId", (req, res) => profileController.getHeroPageData(req, res));

// Protected route to select music from library
router.patch("/music", authenticateToken, (req, res) => profileController.updateMusic(req, res));

export default router;
