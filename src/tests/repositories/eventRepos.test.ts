import eventAccessRepository from "../../repositories/event-access/eventAccessRepository";
import eventEntriesRepository from "../../repositories/events/eventEntriesRepository";
import eventsRepository from "../../repositories/events/eventsRepository";
import pool from "../../config/database";

jest.mock("../../config/database", () => ({
  query: jest.fn()
}));

describe("Event Repositories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("EventAccessRepository", () => {
    it("should create access (Lines 21-64 logic coverage)", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "a1" }] });
      await eventAccessRepository.createAccess({ 
        couple_id: "c1", 
        token: "token", 
        access_type: "all", 
        qr_image_url: "qr" 
      });
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO event_access"), expect.any(Array));
    });

    it("should find by token", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await eventAccessRepository.findByToken("t1");
        expect(pool.query).toHaveBeenCalled();
    });
  });

  describe("EventEntriesRepository", () => {
    it("should record entry (Lines 13-42 logic coverage)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "e1" }] });
        await eventEntriesRepository.recordEntry("c1", "guest", "device");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO event_entries"), expect.any(Array));
    });
  });

  describe("EventsRepository", () => {
    it("should check ownership (Lines 106-110 logic coverage)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ count: "1" }] });
        const owned = await eventsRepository.areEventsOwnedByCouple("c1", ["e1"]);
        expect(owned).toBe(true);
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("SELECT COUNT(*)"), expect.any(Array));
    });
  });
});
