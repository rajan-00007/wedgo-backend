import { Router } from "express";
import { createBlessing } from "../../controllers/blessings/createBlessing";
import { getAdminBlessings, toggleBlessingPin, getPublicBlessings, getAllBlessings } from "../../controllers/blessings/blessingsController";
import { authenticateToken } from "../../middlewares/auth/authMiddleware";
import { upload } from "../../middlewares/multer/upload";

const router = Router();

/**
 * @route POST /api/blessings/:coupleId
 * @desc Create a new blessing for a couple profile
 * @access Public
 */
router.post("/:coupleId", upload.single("image_url"), createBlessing);

/**
 * @route GET /api/blessings/all/:coupleId
 * @desc Get all blessings for a specific couple
 * @access Public
 */
router.get("/all/:coupleId", getAllBlessings);

/** 
 * @route GET /api/blessings/:coupleId
 * @desc Get all blessings for a specific couple (Pinned first)
 * @access Public
 */
router.get("/:coupleId", getPublicBlessings);

/**
 * @route GET /api/blessings/admin/my-blessings
 * @desc Get all blessings for the authenticated user's profile
 * @access Private
 */
router.get("/admin/my-blessings", authenticateToken, getAdminBlessings);

/**
 * @route PATCH /api/blessings/admin/pin/:blessingId
 * @desc Toggle pin status of a blessing
 * @access Private
 */
router.patch("/admin/pin/:blessingId", authenticateToken, toggleBlessingPin);

export default router;
