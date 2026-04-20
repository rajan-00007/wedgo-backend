import { Request, Response } from "express";
import eventAccessRepository from "../../repositories/event-access/eventAccessRepository";
import eventEntriesRepository from "../../repositories/events/eventEntriesRepository";

export const recordEntry = async (req: Request, res: Response) => {
  try {
    const { token, userDeviceId } = req.body;

    if (!token || !userDeviceId) {
      return res.status(400).json({ error: "token and userDeviceId are required" });
    }

    // 1. Validate token
    const access = await eventAccessRepository.findByToken(token);
    if (!access) {
      return res.status(404).json({ error: "Access token not found" });
    }

    // 2. Insert entry into event_entries using couple_id from access record
    const entry = await eventEntriesRepository.recordEntry(access.couple_id, access.id, userDeviceId);

    if (!entry) {
      // Handle duplicate: (couple_id, access_id, user_device_id) UNIQUE constraint hit
      return res.status(200).json({ message: "Already counted" });
    }

    return res.status(201).json({ message: "Entry recorded" });
  } catch (error) {
    console.error("Error recording event entry:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getEntryStats = async (req: Request, res: Response) => {
  try {
    // Get total unique users across all couples
    const totalUniqueUsers = await eventEntriesRepository.getUniqueUsersCountAcrossAllCouples();

    // Get entries grouped by couple
    const coupleWiseCounts = await eventEntriesRepository.getCountsGroupedByCouple();

    return res.json({
      totalUniqueUsers,
      coupleWiseCounts
    });
  } catch (error) {
    console.error("Error fetching entry stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getCoupleEntryCount = async (req: Request, res: Response) => {
  try {
    const { coupleId } = req.params;

    if (!coupleId) {
      return res.status(400).json({ error: "coupleId is required" });
    }

    const count = await eventEntriesRepository.getCountByCouple(coupleId as string);
    return res.json({ coupleId, count });
  } catch (error) {
    console.error("Error fetching couple entry count:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
