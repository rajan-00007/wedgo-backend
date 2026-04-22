import request from "supertest";
import app from "../../app";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import mediaRepository from "../../repositories/media/mediaRepository";
import blessingRepositories from "../../repositories/blessings/blessingRepositories";
import eventEntriesRepository from "../../repositories/events/eventEntriesRepository";
import * as minioService from "../../services/minio/minio.service";
import jwt from "jsonwebtoken";

jest.mock("../../repositories/coupleProfileRepository");
jest.mock("../../repositories/media/mediaRepository");
jest.mock("../../repositories/blessings/blessingRepositories");
jest.mock("../../repositories/events/eventEntriesRepository");
jest.mock("../../services/minio/minio.service");
jest.mock("../../utils/logger");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";
const mockUser = { id: "user-123", phoneNumber: "1234567890" };
const mockToken = jwt.sign(mockUser, ACCESS_TOKEN_SECRET);

describe("Profile Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/profile/update-profile", () => {
    it("should upsert profile successfully (create)", async () => {
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      (coupleProfileRepository.createProfile as jest.Mock).mockResolvedValue({ id: "profile-1" });

      const response = await request(app)
        .post("/api/profile/update-profile")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ partner1: "Alice", partner2: "Bob", eventDate: "2024-12-31" });

      expect(response.status).toBe(200);
      expect(coupleProfileRepository.createProfile).toHaveBeenCalled();
    });

    it("should upsert profile successfully (update)", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "profile-1" });
        (coupleProfileRepository.updateProfile as jest.Mock).mockResolvedValue({ id: "profile-1" });
  
        const response = await request(app)
          .post("/api/profile/update-profile")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ partner1: "Alice", partner2: "Bob", eventDate: "2024-12-31" });
  
        expect(response.status).toBe(200);
        expect(coupleProfileRepository.updateProfile).toHaveBeenCalled();
      });

    it("should return 400 if required fields missing", async () => {
      const response = await request(app)
        .post("/api/profile/update-profile")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ partner1: "Alice" });

      expect(response.status).toBe(400);
    });

    it("should return 500 if database fails", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockRejectedValue(new Error("DB Error"));
  
        const response = await request(app)
          .post("/api/profile/update-profile")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ partner1: "Alice", partner2: "Bob", eventDate: "2024-12-31" });
  
        expect(response.status).toBe(500);
    });
  });

  describe("GET /api/profile/get-profile", () => {
    it("should get profile successfully", async () => {
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "profile-1" });

      const response = await request(app)
        .get("/api/profile/get-profile")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.profile).toBeDefined();
    });

    it("should return 404 if profile not found", async () => {
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get("/api/profile/get-profile")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });

    it("should return 500 if database fails in getProfile", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockRejectedValue(new Error("DB Error"));
  
        const response = await request(app)
          .get("/api/profile/get-profile")
          .set("Authorization", `Bearer ${mockToken}`);
  
        expect(response.status).toBe(500);
      });
  });

  describe("POST /api/profile/preset-wallpaper", () => {
    it("should update preset wallpaper", async () => {
      const response = await request(app)
        .post("/api/profile/preset-wallpaper")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ wallpaper_type: "preset", wallpaper_id: "w1" });

      expect(response.status).toBe(200);
      expect(coupleProfileRepository.updatePresetWallpaper).toHaveBeenCalled();
    });

    it("should return 400 for invalid payload", async () => {
        const response = await request(app)
          .post("/api/profile/preset-wallpaper")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ wallpaper_type: "custom" });
  
        expect(response.status).toBe(400);
    });

    it("should return 500 if database fails in preset-wallpaper", async () => {
        (coupleProfileRepository.updatePresetWallpaper as jest.Mock).mockRejectedValue(new Error("DB Error"));
  
        const response = await request(app)
          .post("/api/profile/preset-wallpaper")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ wallpaper_type: "preset", wallpaper_id: "w1" });
  
        expect(response.status).toBe(500);
      });
  });

  describe("POST /api/profile/custom-wallpaper", () => {
    it("should upload custom wallpapers", async () => {
      (minioService.uploadImage as jest.Mock).mockResolvedValue("w1.jpg");

      const response = await request(app)
        .post("/api/profile/custom-wallpaper")
        .set("Authorization", `Bearer ${mockToken}`)
        .attach("wallpapers", Buffer.from("img"), "w1.jpg")
        .field("time_block_type", "1");

      expect(response.status).toBe(200);
      expect(coupleProfileRepository.setCustomWallpaperUrls).toHaveBeenCalled();
    });

    it("should return 400 if no files", async () => {
        const response = await request(app)
          .post("/api/profile/custom-wallpaper")
          .set("Authorization", `Bearer ${mockToken}`)
          .field("dummy", "data"); // Ensure multipart/form-data
  
        expect(response.status).toBe(400);
    });

    it("should return 500 if database fails in uploadCustomWallpaper", async () => {
        (minioService.uploadImage as jest.Mock).mockResolvedValue("w1.jpg");
        (coupleProfileRepository.setCustomWallpaperUrls as jest.Mock).mockRejectedValue(new Error("DB Error"));
  
        const response = await request(app)
          .post("/api/profile/custom-wallpaper")
          .set("Authorization", `Bearer ${mockToken}`)
          .attach("wallpapers", Buffer.from("img"), "w1.jpg");
  
        expect(response.status).toBe(500);
      });
  });

  describe("GET /api/profile/stats/:coupleId", () => {
    it("should get stats successfully", async () => {
      (mediaRepository.countByCoupleId as jest.Mock).mockResolvedValue(10);
      (blessingRepositories.countByCoupleId as jest.Mock).mockResolvedValue(5);
      (eventEntriesRepository.getCountByCouple as jest.Mock).mockResolvedValue(20);

      const response = await request(app)
        .get("/api/profile/stats/c1");

      expect(response.status).toBe(200);
      expect(response.body.totalMedia).toBe(10);
    });

    it("should return 500 if database fails in stats", async () => {
        (mediaRepository.countByCoupleId as jest.Mock).mockRejectedValue(new Error("DB Error"));
  
        const response = await request(app)
          .get("/api/profile/stats/c1");
  
        expect(response.status).toBe(500);
      });
  });

  describe("GET /api/profile/hero/:coupleId", () => {
    it("should get hero page data", async () => {
      (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({
        partner1_name: "Alice",
        partner2_name: "Bob",
        event_date: "2024-12-31",
        custom_wallpaper_urls: ["w1.jpg"]
      });

      const response = await request(app)
        .get("/api/profile/hero/c1");

      expect(response.status).toBe(200);
      expect(response.body.partner1_name).toBe("Alice");
    });

    it("should get hero page data with no custom wallpapers", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({
          partner1_name: "Alice",
          partner2_name: "Bob",
          event_date: "2024-12-31",
          custom_wallpaper_urls: null
        });
  
        const response = await request(app)
          .get("/api/profile/hero/c1");
  
        expect(response.status).toBe(200);
        expect(response.body.custom_wallpaper_urls).toEqual([]);
      });

    it("should return 404 if profile not found", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue(null);
  
        const response = await request(app)
          .get("/api/profile/hero/c1");
  
        expect(response.status).toBe(404);
    });

    it("should return 500 if database fails in hero", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockRejectedValue(new Error("DB Error"));
  
        const response = await request(app)
          .get("/api/profile/hero/c1");
  
        expect(response.status).toBe(500);
    });
  });

  describe("Profile Controller Direct Calls (Coverage)", () => {
    const profileController = require("../../controllers/profileController").default;

    it("getProfileStats: missing coupleId", async () => {
      const req = { params: { coupleId: undefined } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await profileController.getProfileStats(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "coupleId is required." });
    });

    it("getHeroPageData: missing coupleId", async () => {
      const req = { params: { coupleId: undefined } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await profileController.getHeroPageData(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "coupleId is required." });
    });
  });
});

