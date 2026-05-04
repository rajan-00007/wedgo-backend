import { Request, Response } from "express";
import musicRepository from "../repositories/musicRepository";

export class MusicController {
  async getLibrary(req: Request, res: Response): Promise<void> {
    try {
      const tracks = await musicRepository.getAllActiveTracks();
      res.status(200).json({ tracks });
    } catch (error) {
      console.error("Error fetching music library:", error);
      res.status(500).json({ message: "Failed to fetch music library." });
    }
  }
}

export default new MusicController();
