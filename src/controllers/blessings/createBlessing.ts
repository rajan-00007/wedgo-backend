import { Request, Response } from "express";
import blessingRepositories from "../../repositories/blessings/blessingRepositories";
import logger from "../../utils/logger";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import { createBlessingValidator } from "../../validators/blessings/blessingValidator";
import { uploadImage } from "../../services/minio/minio.service";
import { ZodError } from "zod";
import { getFullMediaUrl } from "../../utils/urlUtils";

export const createBlessing = async (req: Request, res: Response): Promise<void> => {
  try {
    createBlessingValidator.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ 
        message: "Validation failed.", 
        errors: error.issues.map((err) => ({ field: err.path.join('.'), message: err.message }))
      });
      return;
    }
    res.status(400).json({ message: "Invalid request data." });
    return;
  }

  const { coupleId } = req.params;
  const { name, message, image_url: bodyImageUrl } = req.body;
  const file = req.file;

  if (!coupleId || typeof coupleId !== "string") {
    res.status(400).json({ message: "Couple ID is required and must be a string." });
    return;
  }

  try {
    const profile = await coupleProfileRepository.findById(coupleId);
    if (!profile) {
      res.status(404).json({ message: "Couple profile not found." });
      return;
    }
    
    let image_url = bodyImageUrl || null;
    if (file) {
      image_url = await uploadImage(file, "blessings");
    }

    const blessing = await blessingRepositories.createBlessing({
      couple_id: profile.id,
      name,
      message,
      image_url: image_url || undefined,
    });

    if (blessing) {
      blessing.image_url = getFullMediaUrl(blessing.image_url);
    }

    logger.info(`Blessing created: ${blessing.id} for couple: ${profile.id}`);
    res.status(201).json({ message: "Blessing submitted successfully.", blessing });
  } catch (error) {
    logger.error(`Error creating blessing: ${error}`);
    res.status(500).json({ message: "Failed to submit blessing." });
  }
};
 