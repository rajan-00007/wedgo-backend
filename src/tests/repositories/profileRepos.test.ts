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
