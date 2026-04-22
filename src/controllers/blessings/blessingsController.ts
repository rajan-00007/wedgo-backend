import { Request, Response } from "express";
import blessingRepositories from "../../repositories/blessings/blessingRepositories";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import logger from "../../utils/logger";
import { AuthRequest } from "../../middlewares/auth/authMiddleware";
import { getFullMediaUrl } from "../../utils/urlUtils";

export const getAdminBlessings = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const deviceId = req.headers['x-device-id'] as string;
  
  if (!userId) {
    res.status(401).json({ message: "Unauthorized: No user ID found in token" });
    return;
  }

  try {
    // Check if user has a couple profile
    const profile = await coupleProfileRepository.findByUserId(userId);
    if (!profile) {
      res.status(404).json({ message: "Couple profile not found for this user" });
      return;
    }

    const blessings = await blessingRepositories.findByCoupleId(profile.id, deviceId);
    const blessingsWithUrls = blessings.map(b => ({ ...b, image_url: getFullMediaUrl(b.image_url) }));
    res.status(200).json({ blessings: blessingsWithUrls });
  } catch (error) {
    logger.error(`Error fetching admin blessings: ${error}`);
    res.status(500).json({ message: "Internal server error while fetching blessings" });
  }
};


export const toggleBlessingPin = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { blessingId } = req.params;
  const { isPinned } = req.body;

  if (!blessingId || typeof blessingId !== "string") {
    res.status(400).json({ message: "Blessing ID is required and must be a string." });
    return;
  }

  if (!userId) {
    res.status(401).json({ message: "Unauthorized: No user ID found in token" });
    return;
  }

  if (typeof isPinned !== 'boolean') {
    res.status(400).json({ message: "isPinned field is required and must be a boolean" });
    return;
  }

  try {
    const blessing = await blessingRepositories.findById(blessingId);
    if (!blessing) {
      res.status(404).json({ message: "Blessing not found" });
      return;
    }

    // Security check: Ensure the blessing belongs to the user's couple profile
    const profile = await coupleProfileRepository.findByUserId(userId);
    if (!profile || profile.id !== blessing.couple_id) {
      res.status(403).json({ message: "Forbidden: You don't have permission to modify this blessing" });
      return;
    }

    const updatedBlessing = await blessingRepositories.updatePinStatus(blessingId, isPinned);
    if (updatedBlessing) {
      updatedBlessing.image_url = getFullMediaUrl(updatedBlessing.image_url);
    }
    res.status(200).json({ 
      message: `Blessing ${isPinned ? 'pinned' : 'unpinned'} successfully`, 
      blessing: updatedBlessing 
    });
  } catch (error) {
    logger.error(`Error toggling blessing pin: ${error}`);
    res.status(500).json({ message: "Internal server error while toggling pin status" });
  }
};
/**
 * @desc Get all blessings for a specific couple profile (Public)
 * @route GET /api/blessings/:coupleId
 * @access Public
 */
export const getPublicBlessings = async (req: Request, res: Response): Promise<void> => {
  const { coupleId } = req.params;
  const deviceId = req.headers['x-device-id'] as string;

  if (!coupleId || typeof coupleId !== "string") {
    res.status(400).json({ message: "Couple ID is required." });
    return;
  }

  try {
    // Return ONLY pinned blessings for the guest view
    const blessings = await blessingRepositories.findPinnedByCoupleId(coupleId, deviceId);
    const blessingsWithUrls = blessings.map(b => ({ ...b, image_url: getFullMediaUrl(b.image_url) }));
    res.status(200).json({ blessings: blessingsWithUrls });
  } catch (error) {
    logger.error(`Error fetching blessings for couple ${coupleId}: ${error}`);
    res.status(500).json({ message: "Failed to fetch blessings." });
  }
};

/**
 * @desc Get all blessings for a specific couple profile (Public/User)
 * @route GET /api/blessings/all/:coupleId
 * @access Public
 */
export const getAllBlessings = async (req: Request, res: Response): Promise<void> => {
  const { coupleId } = req.params;
  const deviceId = req.headers['x-device-id'] as string;

  if (!coupleId || typeof coupleId !== "string") {
    res.status(400).json({ message: "Couple ID is required." });
    return;
  }

  try {
    const blessings = await blessingRepositories.findByCoupleId(coupleId, deviceId);
    const blessingsWithUrls = blessings.map(b => ({ ...b, image_url: getFullMediaUrl(b.image_url) }));
    res.status(200).json({ blessings: blessingsWithUrls });
  } catch (error) {
    logger.error(`Error fetching all blessings for couple ${coupleId}: ${error}`);
    res.status(500).json({ message: "Failed to fetch all blessings." });
  }
};

/**
 * @desc Like a blessing (Public)
 * @route POST /api/blessings/like/:blessingId
 */
export const likeBlessing = async (req: Request, res: Response): Promise<void> => {
  const blessingId = req.params.blessingId as string;
  const deviceId = req.headers['x-device-id'] as string;

  if (!blessingId) {
    res.status(400).json({ message: "Blessing ID is required." });
    return;
  }

  if (!deviceId) {
    res.status(400).json({ message: "Device ID header (x-device-id) is required." });
    return;
  }

  try {
    await blessingRepositories.likeBlessing(blessingId, deviceId);
    res.status(200).json({ message: "Blessing liked successfully." });
  } catch (error) {
    logger.error(`Error liking blessing ${blessingId}: ${error}`);
    res.status(500).json({ message: "Failed to like blessing." });
  }
};
