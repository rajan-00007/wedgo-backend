import { Request, Response } from "express";
import coupleProfileRepository from "../repositories/coupleProfileRepository";
import mediaRepository from "../repositories/media/mediaRepository";
import blessingRepositories from "../repositories/blessings/blessingRepositories";
import eventEntriesRepository from "../repositories/events/eventEntriesRepository";
import musicRepository from "../repositories/musicRepository";
import { uploadImage } from "../services/minio/minio.service";
import { getFullMediaUrl } from "../utils/urlUtils";

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
    const { time_block_type } = req.body;

    if (!files || files.length === 0) {
      res.status(400).json({ message: "No image files uploaded." });
      return;
    }

    try {
      // 1. Upload to MinIO in parallel
      const uploadPromises = files.map(file => uploadImage(file, "wallpapers"));
      const objectNames = await Promise.all(uploadPromises);

      // 2. Update DB with the array of object paths
      const parsedTimeBlockType = time_block_type ? parseInt(time_block_type as string) : undefined;
      await coupleProfileRepository.setCustomWallpaperUrls(userId, objectNames, parsedTimeBlockType);

      res.status(200).json({
        message: "Custom wallpapers uploaded successfully.",
        urls: objectNames.map(url => getFullMediaUrl(url))
      });
    } catch (error) {
      console.error("Error uploading custom wallpapers:", error);
      res.status(500).json({ message: "Failed to upload custom wallpapers." });
    }
  }

  async getProfileStats(req: Request, res: Response): Promise<void> {
    const { coupleId } = req.params;

    if (!coupleId) {
      res.status(400).json({ message: "coupleId is required." });
      return;
    }

    try {
      const coupleIdStr = coupleId as string;
      const [totalMedia, totalBlessings, totalEntries] = await Promise.all([
        mediaRepository.countByCoupleId(coupleIdStr),
        blessingRepositories.countByCoupleId(coupleIdStr),
        eventEntriesRepository.getCountByCouple(coupleIdStr)
      ]);

      res.status(200).json({
        totalMedia,
        totalBlessings,
        totalEntries
      });
    } catch (error) {
      console.error("Error getting profile stats:", error);
      res.status(500).json({ message: "Failed to get profile statistics." });
    }
  }

  async getHeroPageData(req: Request, res: Response): Promise<void> {
    const { coupleId } = req.params;

    if (!coupleId) {
      res.status(400).json({ message: "coupleId is required." });
      return;
    }

    try {
      const profile = await coupleProfileRepository.findById(coupleId as string);

      if (!profile) {
        res.status(404).json({ message: "Profile not found." });
        return;
      }

      let musicUrl = null;
      if (profile.selected_music_id) {
        const tracks = await musicRepository.getAllActiveTracks();
        const selectedTrack = tracks.find(t => t.id === profile.selected_music_id);
        if (selectedTrack) {
          musicUrl = selectedTrack.file_url;
        }
      }

      res.status(200).json({
        partner1_name: profile.partner1_name,
        partner2_name: profile.partner2_name,
        event_date: profile.event_date,
        custom_wallpaper_urls: profile.custom_wallpaper_urls?.map((url: string) => getFullMediaUrl(url)) || [],
        time_block_type: profile.time_block_type || null,
        music_url: musicUrl
      });
    } catch (error) {
      console.error("Error getting hero page data:", error);
      res.status(500).json({ message: "Failed to get hero page data." });
    }
  }

  async updateMusic(req: Request, res: Response): Promise<void> {
    const { music_id } = req.body;
    const userId = (req as any).user.id;

    if (!music_id) {
      res.status(400).json({ message: "music_id is required." });
      return;
    }

    try {
      await coupleProfileRepository.updateSelectedMusic(userId, music_id);
      res.status(200).json({ message: "Music preference updated successfully." });
    } catch (error) {
      console.error("Error updating music preference:", error);
      res.status(500).json({ message: "Failed to update music preference." });
    }
  }
}

export default new ProfileController();
