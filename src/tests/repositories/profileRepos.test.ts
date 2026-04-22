import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import wallpaperRepository from "../../repositories/wallpaperRepository";
import pool from "../../config/database";

jest.mock("../../config/database", () => ({
  query: jest.fn()
}));

describe("Profile & Wallpaper Repositories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("CoupleProfileRepository", () => {
    it("should find by user id", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "c1" }] });
      const profile = await coupleProfileRepository.findByUserId("u1");
      expect(profile?.id).toBe("c1");
    });

    it("should find by id (Lines 26-32)", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: "c1" }] })
            .mockResolvedValueOnce({ rows: [] });
        
        const c1 = await coupleProfileRepository.findById("c1");
        expect(c1?.id).toBe("c1");

        const c2 = await coupleProfileRepository.findById("c2");
        expect(c2).toBeNull();
    });

    it("should create profile", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "c1" }] });
      await coupleProfileRepository.createProfile("u1", "P1", "P2", new Date());
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO couple_profiles"), expect.any(Array));
    });

    it("should update profile", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "c1" }] });
      await coupleProfileRepository.updateProfile("u1", "P1", "P2", new Date());
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE couple_profiles"), expect.any(Array));
    });

    it("should update preset wallpaper (Lines 50-60)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await coupleProfileRepository.updatePresetWallpaper("u1", "w1");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE couple_profiles"), expect.any(Array));
    });

    it("should set custom wallpaper urls (Lines 62-74)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await coupleProfileRepository.setCustomWallpaperUrls("u1", ["url1"], 1);
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE couple_profiles"), expect.any(Array));

        // Coverage for timeBlockType || null (Line 72)
        await coupleProfileRepository.setCustomWallpaperUrls("u1", ["url2"]);
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE couple_profiles"), [["url2"], null, "u1"]);
    });
  });

  describe("WallpaperRepository", () => {
    it("should get all wallpapers (Lines 11-14 logic coverage)", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "w1" }] });
      const wp = await wallpaperRepository.getAllWallpapers();
      expect(wp).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("SELECT * FROM wallpapers"));
    });
  });
});
