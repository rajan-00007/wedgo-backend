import { Router } from "express";
import { uploadMedia, getAdminMedia, toggleMediaPin, getPublicMedia, getAllMedia, likeMedia } from "../../controllers/media/mediaController";
import { authenticateToken } from "../../middlewares/auth/authMiddleware";
import { upload, uploadMediaFiles } from "../../middlewares/multer/upload";

const router = Router();

/**
 * @route POST /api/media/like/:mediaId
 * @desc Like a media
 * @access Public
 */
router.post("/like/:mediaId", likeMedia);

/**
 * @route POST /api/media/:coupleId
 * @desc Upload media for a couple profile
 * @access Public
 */
router.post("/:coupleId", uploadMediaFiles.any(), uploadMedia);

/**
 * @route GET /api/media/all/:coupleId
 * @desc Get all media for a specific couple
 * @access Public
 */
router.get("/all/:coupleId", getAllMedia);

/**
 * @route GET /api/media/:coupleId
 * @desc Get all pinned media for a specific couple
 * @access Public
 */
router.get("/:coupleId", getPublicMedia);

/**
 * @route GET /api/media/admin/my-media
 * @desc Get all media for the authenticated user's profile
 * @access Private
 */
router.get("/admin/my-media", authenticateToken, getAdminMedia);

/**
 * @route PATCH /api/media/admin/pin/:mediaId
 * @desc Toggle pin status of a media
 * @access Private
 */
router.patch("/admin/pin/:mediaId", authenticateToken, toggleMediaPin);

export default router;
