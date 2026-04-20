import { Request, Response } from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import { AuthRequest } from "../../middlewares/auth/authMiddleware";
import eventAccessRepository from "../../repositories/event-access/eventAccessRepository";
import eventsRepository from "../../repositories/events/eventsRepository";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import { uploadBuffer } from "../../services/minio/minio.service";
import { getFullMediaUrl } from "../../utils/urlUtils";

export const generateFullAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { coupleId } = req.query as { coupleId?: string };

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

    // Check if 'all' access already exists for this couple
    const existingAccess = await eventAccessRepository.findByCoupleAndType(coupleId, "all");
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (existingAccess) {
      const url = `${frontendBaseUrl}/event?token=${existingAccess.token}`;
      let qrCode = existingAccess.qr_image_url ? getFullMediaUrl(existingAccess.qr_image_url) : null;
      
      if (!qrCode) {
        qrCode = await QRCode.toDataURL(url);
      }

      return res.status(200).json({
        url,
        qrCode,
        message: "Existing access retrieved"
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const url = `${frontendBaseUrl}/event?token=${token}`;
    
    const qrBuffer = await QRCode.toBuffer(url, { type: 'png' });
    const qrObjectName = await uploadBuffer(qrBuffer, 'image/png', 'qr-codes');

    await eventAccessRepository.createAccess({
      couple_id: coupleId,
      token,
      access_type: "all",
      qr_image_url: qrObjectName,
    });

    return res.status(201).json({
      url,
      qrCode: getFullMediaUrl(qrObjectName),
      message: "New access generated"
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
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const url = `${frontendBaseUrl}/event?token=${token}`;

    const qrBuffer = await QRCode.toBuffer(url, { type: 'png' });
    const qrObjectName = await uploadBuffer(qrBuffer, 'image/png', 'qr-codes');

    const access = await eventAccessRepository.createAccess({
      couple_id: coupleId,
      token,
      access_type: "custom",
      qr_image_url: qrObjectName,
    });

    // Insert mappings
    await eventAccessRepository.addEventsToAccess(access.id, eventIds);


    return res.status(201).json({
      url,
      qrCode: getFullMediaUrl(qrObjectName),
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

export const getWelcomeDataByToken = async (req: Request, res: Response) => {
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

    const profile = await coupleProfileRepository.findById(access.couple_id);

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.status(200).json({
      couple_id: access.couple_id,
      partner1_name: profile.partner1_name,
      partner2_name: profile.partner2_name,
      event_date: profile.event_date,
      custom_wallpaper_urls: profile.custom_wallpaper_urls?.map((url: string) => getFullMediaUrl(url)) || [],
      time_block_type: profile.time_block_type || null
    });
  } catch (error) {
    console.error("Error fetching welcome data by token:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};