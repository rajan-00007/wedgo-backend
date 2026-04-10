import { Request, Response } from "express";
import coupleProfileRepository from "../repositories/coupleProfileRepository";
import { uploadImage } from "../services/minio/minio.service";

export class ProfileController {
  async upsertProfile(req: Request, res: Response): Promise<void> {
    const { partner1, partner2, eventDate, wallpaper_type, wallpaper_id } = req.body;
    const userId = (req as any).user.id;

    if (!partner1 || !partner2 || !eventDate) {
      res.status(400).json({ message: "Partner names and event date are required." });
      return;
    }

    try {
      let profile = await coupleProfileRepository.findByUserId(userId);
      if (profile) {
        profile = await coupleProfileRepository.updateProfile(userId, partner1, partner2, new Date(eventDate), wallpaper_type, wallpaper_id);
      } else {
        profile = await coupleProfileRepository.createProfile(userId, partner1, partner2, new Date(eventDate), wallpaper_type, wallpaper_id);
      }

      res.status(200).json({
        message: "Profile updated successfully.",
        profile
      });
    } catch (error) {
      console.error("Error upserting profile:", error);
      res.status(500).json({ message: "Failed to update profile." });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;

    try {
      const profile = await coupleProfileRepository.findByUserId(userId);
      if (!profile) {
        res.status(404).json({ message: "Profile not found." });
        return;
      }

      res.status(200).json({ profile });
    } catch (error) {
      console.error("Error getting profile:", error);
      res.status(500).json({ message: "Failed to get profile." });
    }
  }

  async updatePresetWallpaper(req: Request, res: Response): Promise<void> {
    const { wallpaper_type, wallpaper_id } = req.body;
    const userId = (req as any).user.id;

    if (wallpaper_type !== 'preset' || !wallpaper_id) {
      res.status(400).json({ message: "Invalid payload. Expected wallpaper_type 'preset' and a wallpaper_id." });
      return;
    }

    try {
      await coupleProfileRepository.updatePresetWallpaper(userId, wallpaper_id);
      res.status(200).json({ message: "Preset wallpaper updated successfully." });
    } catch (error) {
      console.error("Error updating preset wallpaper:", error);
      res.status(500).json({ message: "Failed to update wallpaper." });
    }
  }

  async uploadCustomWallpaper(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ message: "No image files uploaded." });
      return;
    }

    try {
      // 1. Upload to MinIO in parallel
      const uploadPromises = files.map(file => uploadImage(file, "wallpapers"));
      const objectNames = await Promise.all(uploadPromises);

      // 2. Update DB with the array of object paths
      await coupleProfileRepository.setCustomWallpaperUrls(userId, objectNames);

      res.status(200).json({
        message: "Custom wallpapers uploaded successfully.",
        urls: objectNames
      });
    } catch (error) {
      console.error("Error uploading custom wallpapers:", error);
      res.status(500).json({ message: "Failed to upload custom wallpapers." });
    }
  }
}

export default new ProfileController();
