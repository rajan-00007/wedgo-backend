import blessingRepositories from "../../repositories/blessings/blessingRepositories";
import mediaRepository from "../../repositories/media/mediaRepository";
import pool from "../../config/database";

jest.mock("../../config/database", () => ({
  query: jest.fn()
}));

describe("Blessing & Media Repositories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("BlessingRepository", () => {
    it("should create blessing (Lines 22-92 logic coverage)", async () => {
      const mockB = { id: "b1", name: "G" };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockB] });
      
      const b = await blessingRepositories.createBlessing({ 
        couple_id: "c1", 
        name: "G", 
        message: "M", 
        image_url: "u1" 
      });
      expect(b).toEqual(mockB);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO blessings"), expect.any(Array));

      // Test null image_url branch (Line 31)
      await blessingRepositories.createBlessing({ couple_id: "c1", name: "G", message: "M" });
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO blessings"), expect.any(Array));
    });

    it("should find by couple id", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await blessingRepositories.findByCoupleId("c1");
        expect(pool.query).toHaveBeenCalled();
    });

    it("should find by id (Lines 50-53)", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: "b1" }] })
            .mockResolvedValueOnce({ rows: [] });
        
        const b1 = await blessingRepositories.findById("b1");
        expect(b1?.id).toBe("b1");

        const b2 = await blessingRepositories.findById("b2");
        expect(b2).toBeNull();
    });

    it("should delete blessing (Lines 55-58)", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 0 });
        
        expect(await blessingRepositories.deleteBlessing("b1")).toBe(true);
        expect(await blessingRepositories.deleteBlessing("b2")).toBe(false);
    });

    it("should update pin status (Lines 60-66)", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: "b1", is_pinned: true }] })
            .mockResolvedValueOnce({ rows: [] });
        
        const b1 = await blessingRepositories.updatePinStatus("b1", true);
        expect(b1?.is_pinned).toBe(true);

        const b2 = await blessingRepositories.updatePinStatus("b2", false);
        expect(b2).toBeNull();
    });

    it("should find pinned by couple id (Lines 68-79)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await blessingRepositories.findPinnedByCoupleId("c1");
        expect(pool.query).toHaveBeenCalled();
    });

    it("should count by couple id (Lines 81-84)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ count: "5" }] });
        const count = await blessingRepositories.countByCoupleId("c1");
        expect(count).toBe(5);
        
        // Default to 0 if null (Line 83)
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ count: null }] });
        expect(await blessingRepositories.countByCoupleId("c2")).toBe(0);
    });

    it("should like blessing", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await blessingRepositories.likeBlessing("b1", "d1");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO blessing_likes"), ["b1", "d1"]);
    });
  });

  describe("MediaRepository", () => {
    it("should create media", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "m1" }] });
        await mediaRepository.createMedia({ couple_id: "c1", file_url: "img", file_type: "image" });
        expect(pool.query).toHaveBeenCalled();
    });

    it("should find media by id (Lines 24-28 branch)", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: "m1" }] })
            .mockResolvedValueOnce({ rows: [] });
        
        expect(await mediaRepository.findById("m1")).not.toBeNull();
        expect(await mediaRepository.findById("m2")).toBeNull();
    });

    it("should update pin status (Lines 30-39)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "m1", is_pinned: true }] });
        const m = await mediaRepository.updatePinStatus("m1", true);
        expect(m.is_pinned).toBe(true);
    });

    it("should count media by couple id (Lines 41-45 logic coverage)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ count: "10" }] });
        const count = await mediaRepository.countByCoupleId("c1");
        expect(count).toBe(10);

        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ count: null }] });
        expect(await mediaRepository.countByCoupleId("c2")).toBe(0);
    });

    it("should find media by couple id (Lines 56-67)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await mediaRepository.findByCoupleId("c1");
        expect(pool.query).toHaveBeenCalled();
    });

    it("should find pinned media (Lines 69-80)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await mediaRepository.findPinnedByCoupleId("c1");
        expect(pool.query).toHaveBeenCalled();
    });

    it("should like media (Lines 47-54 logic coverage)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await mediaRepository.likeMedia("m1", "d1");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO media_likes"), ["m1", "d1"]);
    });

    it("should handle null rowCount in delete (Line 57 fallback in blessings)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rowCount: null });
        expect(await blessingRepositories.deleteBlessing("b1")).toBe(false);
    });

    it("should return null if media not found in updatePinStatus (Line 65 equivalent)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        const m = await mediaRepository.updatePinStatus("m2", true);
        expect(m).toBeNull();
    });
  });
});
