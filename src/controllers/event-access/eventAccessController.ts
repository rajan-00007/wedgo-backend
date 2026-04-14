import { Request, Response } from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import { AuthRequest } from "../../middlewares/auth/authMiddleware";
import eventAccessRepository from "../../repositories/event-access/eventAccessRepository";
import eventsRepository from "../../repositories/events/eventsRepository";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";

export const generateFullAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { coupleId } = req.body;

    if (!coupleId) {
      return res.status(400).json({ error: "coupleId is required" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profile = await coupleProfileRepository.findById(coupleId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    if (profile.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden: You do not own this profile" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    await eventAccessRepository.createAccess({
      couple_id: coupleId,
      token,
      access_type: "all",
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const url = `${frontendBaseUrl}/event?token=${token}`;

    const qrCode = await QRCode.toDataURL(url);

    return res.status(201).json({
      url,
      qrCode,
    });
  } catch (error) {
    console.error("Error generating full access:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const generateCustomAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { coupleId, eventIds } = req.body;

    if (!coupleId || !eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: "coupleId and non-empty eventIds array are required" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profile = await coupleProfileRepository.findById(coupleId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    if (profile.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden: You do not own this profile" });
    }

    // Validate event ownership
    const allOwned = await eventsRepository.areEventsOwnedByCouple(coupleId, eventIds);
    if (!allOwned) {
      return res.status(400).json({ error: "One or more events do not belong to this couple" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const access = await eventAccessRepository.createAccess({
      couple_id: coupleId,
      token,
      access_type: "custom",
    });

    // Insert mappings
    await eventAccessRepository.addEventsToAccess(access.id, eventIds);

    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const url = `${frontendBaseUrl}/event?token=${token}`;

    const qrCode = await QRCode.toDataURL(url);

    return res.status(201).json({
      url,
      qrCode,
    });
  } catch (error) {
    console.error("Error generating custom access:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getEventsByToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;


    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "token is required" });
    }

    const access = await eventAccessRepository.findByToken(token);

    if (!access) {
      return res.status(403).json({ error: "Invalid token" });
    }

    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return res.status(403).json({ error: "Token expired" });
    }

    if (access.access_type === "all") {
      const events = await eventsRepository.findByCoupleId(access.couple_id);
      return res.json(events);
    }

    if (access.access_type === "custom") {
      const events = await eventAccessRepository.getMappedEvents(access.id);
      return res.json(events);
    }

    return res.status(403).json({ error: "Access type not supported" });
  } catch (error) {
    console.error("Error fetching events by token:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};