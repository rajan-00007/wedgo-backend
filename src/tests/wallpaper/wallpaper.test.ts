import request from "supertest";
import app from "../../app";
import wallpaperRepository from "../../repositories/wallpaperRepository";

jest.mock("../../repositories/wallpaperRepository");

describe("Wallpaper Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/wallpapers/presets", () => {
    it("should fetch preset wallpapers successfully", async () => {
      const mockWallpapers = [{ id: "w1", url: "w1.jpg" }];
      (wallpaperRepository.getAllWallpapers as jest.Mock).mockResolvedValue(mockWallpapers);

      const response = await request(app)
        .get("/api/wallpapers/presets");

      expect(response.status).toBe(200);
      expect(response.body.wallpapers).toHaveLength(1);
    });

    it("should return 500 if database fails", async () => {
      (wallpaperRepository.getAllWallpapers as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const response = await request(app)
        .get("/api/wallpapers/presets");

      expect(response.status).toBe(500);
    });
  });
});
