import { Request, Response } from "express";
import wallpaperRepository from "../repositories/wallpaperRepository";

export class WallpaperController {
  async getPresets(req: Request, res: Response): Promise<void> {
    try {
      const wallpapers = await wallpaperRepository.getAllWallpapers();
      res.status(200).json({ wallpapers });
    } catch (error) {
      console.error("Error fetching wallpapers:", error);
      res.status(500).json({ message: "Failed to fetch preset wallpapers." });
    }
  }
}

export default new WallpaperController();
