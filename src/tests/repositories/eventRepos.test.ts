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

    it("should find by couple and type (Lines 38-44)", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: "a1" }] })
            .mockResolvedValueOnce({ rows: [] });
        
        const a1 = await eventAccessRepository.findByCoupleAndType("c1", "all");
        expect(a1?.id).toBe("a1");

        const a2 = await eventAccessRepository.findByCoupleAndType("c1", "custom");
        expect(a2).toBeNull();
    });

    it("should add events to access (Lines 46-54)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await eventAccessRepository.addEventsToAccess("a1", ["e1", "e2"]);
        expect(pool.query).toHaveBeenCalledTimes(2); 
    });

    it("should get mapped events (Lines 56-65)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await eventAccessRepository.getMappedEvents("a1");
        expect(pool.query).toHaveBeenCalled();
    });
  });

  describe("EventEntriesRepository", () => {
    it("should record entry (Lines 13-42 logic coverage)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "e1" }] });
        await eventEntriesRepository.recordEntry("c1", "guest", "device");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO event_entries"), expect.any(Array));
    });

    it("should get count by couple (Lines 23-29)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ count: "10" }] });
        const count = await eventEntriesRepository.getCountByCouple("c1");
        expect(count).toBe(10);
    });

    it("should get unique users count (Lines 31-36)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ count: "50" }] });
        const count = await eventEntriesRepository.getUniqueUsersCountAcrossAllCouples();
        expect(count).toBe(50);
    });

    it("should get counts grouped by couple (Lines 38-46)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ couple_id: "c1", count: "5" }] });
        const counts = await eventEntriesRepository.getCountsGroupedByCouple();
        expect(counts[0].count).toBe(5);
    });
  });

  describe("EventsRepository", () => {
    it("should check ownership (Lines 106-110 logic coverage)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ count: "1" }] });
        const owned = await eventsRepository.areEventsOwnedByCouple("c1", ["e1"]);
        expect(owned).toBe(true);
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("SELECT COUNT(*)"), expect.any(Array));
    });

    it("should return null if token not found (Line 35 branch in access repo)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        const res = await eventAccessRepository.findByToken("invalid");
        expect(res).toBeNull();
    });

    it("should return 0 if count is null (Line 27 fallback equivalent in entries repo)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ count: null }] });
        const count = await eventEntriesRepository.getCountByCouple("c1");
        expect(count).toBe(0);
    });

    it("should cover recordEntry null branch (Line 20)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        const res = await eventEntriesRepository.recordEntry("c1", "a1", "d1");
        expect(res).toBeNull();
    });

    it("should cover unique users null branch (Line 35)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ count: null }] });
        const res = await eventEntriesRepository.getUniqueUsersCountAcrossAllCouples();
        expect(res).toBe(0);
    });

    it("should cover grouped counts null branch (Line 44)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ couple_id: "c1", count: null }] });
        const res = await eventEntriesRepository.getCountsGroupedByCouple();
        expect(res[0].count).toBe(0);
    });

    it("should cover eventAccess create null branches (Line 25)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "a1" }] });
        await eventAccessRepository.createAccess({ 
            couple_id: "c1", 
            token: "t", 
            access_type: "all" 
            // missing expires_at and qr_image_url
        });
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO event_access"), expect.arrayContaining([null, null]));
    });
  });
});
