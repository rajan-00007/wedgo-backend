import { Request, Response } from "express";
import mediaRepository from "../../repositories/media/mediaRepository";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import logger from "../../utils/logger";
import { uploadImage } from "../../services/minio/minio.service";
import { AuthRequest } from "../../middlewares/auth/authMiddleware";
import { getFullMediaUrl } from "../../utils/urlUtils";

/**
 * @desc Upload media for a couple profile (Public)
 * @route POST /api/media/:coupleId
 */
export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  const { coupleId } = req.params;
  const files = req.files as Express.Multer.File[];

  if (!coupleId || typeof coupleId !== "string") {
    res.status(400).json({ message: "Couple ID is required." });
    return;
  }

  if (!files || files.length === 0) {
    res.status(400).json({ message: "No files uploaded." });
    return;
  }

  try {
    const profile = await coupleProfileRepository.findById(coupleId);
    if (!profile) {
      res.status(404).json({ message: "Couple profile not found." });
      return;
    }

    const mediaResults = [];

    for (const file of files) {
      const fileUrl = await uploadImage(file, "media");
      const fileType = file.mimetype.startsWith("video/") ? "video" : "image";

      const media = await mediaRepository.createMedia({
        couple_id: profile.id,
        file_url: fileUrl,
        file_type: fileType as "image" | "video",
      });

      media.file_url = getFullMediaUrl(media.file_url) || media.file_url;

      mediaResults.push(media);
      logger.info(`${fileType} uploaded: ${media.id} for couple: ${profile.id}`);
    }


    res.status(201).json({
      message: `${files.length} media file(s) uploaded successfully.`,
      media: mediaResults
    });
  } catch (error) {
    logger.error(`Error uploading media: ${error}`);
    res.status(500).json({ message: "Failed to upload media." });
  }
};


/**
 * @desc Get all media for the authenticated user's profile (Admin)
 * @route GET /api/media/admin/my-media
 */
export const getAdminMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized: No user ID found" });
    return;
  }

  try {
    const profile = await coupleProfileRepository.findByUserId(userId);
    if (!profile) {
      res.status(404).json({ message: "Couple profile not found" });
      return;
    }

    const media = await mediaRepository.findByCoupleId(profile.id);
    const mediaWithUrls = media.map(m => ({ ...m, file_url: getFullMediaUrl(m.file_url) }));
    res.status(200).json({ media: mediaWithUrls });
  } catch (error) {
    logger.error(`Error fetching admin media: ${error}`);
    res.status(500).json({ message: "Internal server error while fetching media" });
  }
};

/**
 * @desc Toggle pin status of a media (Admin)
 * @route PATCH /api/media/admin/pin/:mediaId
 */
export const toggleMediaPin = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { mediaId } = req.params;
  const { isPinned } = req.body;

  if (!mediaId || typeof mediaId !== "string") {
    res.status(400).json({ message: "Media ID is required." });
    return;
  }

  if (typeof isPinned !== 'boolean') {
    res.status(400).json({ message: "isPinned field is required and must be a boolean" });
    return;
  }

  try {
    const media = await mediaRepository.findById(mediaId);
    if (!media) {
      res.status(404).json({ message: "Media not found" });
      return;
    }

    const profile = await coupleProfileRepository.findByUserId(userId!);
    if (!profile || profile.id !== media.couple_id) {
      res.status(403).json({ message: "Forbidden: You don't have permission to modify this media" });
      return;
    }

    const updatedMedia = await mediaRepository.updatePinStatus(mediaId, isPinned);
    if (updatedMedia) {
      updatedMedia.file_url = getFullMediaUrl(updatedMedia.file_url) || updatedMedia.file_url;
    }
    res.status(200).json({
      message: `Media ${isPinned ? 'pinned' : 'unpinned'} successfully`,
      media: updatedMedia
    });
  } catch (error) {
    logger.error(`Error toggling media pin: ${error}`);
    res.status(500).json({ message: "Internal server error while toggling pin status" });
  }
};

/**
 * @desc Get pinned media for a specific couple (Public)
 * @route GET /api/media/:coupleId
 */
export const getPublicMedia = async (req: Request, res: Response): Promise<void> => {
  const { coupleId } = req.params;

  if (!coupleId || typeof coupleId !== "string") {
    res.status(400).json({ message: "Couple ID is required." });
    return;
  }

  try {
    const media = await mediaRepository.findPinnedByCoupleId(coupleId);
    const mediaWithUrls = media.map(m => ({ ...m, file_url: getFullMediaUrl(m.file_url) }));
    res.status(200).json({ media: mediaWithUrls });
  } catch (error) {
    logger.error(`Error fetching media for couple ${coupleId}: ${error}`);
    res.status(500).json({ message: "Failed to fetch media." });
  }
};

/**
 * @desc Get all media for a specific couple (Public/User)
 * @route GET /api/media/all/:coupleId
 */
export const getAllMedia = async (req: Request, res: Response): Promise<void> => {
  const { coupleId } = req.params;

  if (!coupleId || typeof coupleId !== "string") {
    res.status(400).json({ message: "Couple ID is required." });
    return;
  }

  try {
    const media = await mediaRepository.findByCoupleId(coupleId);
    const mediaWithUrls = media.map(m => ({ ...m, file_url: getFullMediaUrl(m.file_url) }));
    res.status(200).json({ media: mediaWithUrls });
  } catch (error) {
    logger.error(`Error fetching all media for couple ${coupleId}: ${error}`);
    res.status(500).json({ message: "Failed to fetch all media." });
  }
};
