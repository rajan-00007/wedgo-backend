import request from "supertest";
import app from "../../app";
import jwt from "jsonwebtoken";
import mediaRepository from "../../repositories/media/mediaRepository";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import { uploadImage } from "../../services/minio/minio.service";
import logger from "../../utils/logger";
import pool from "../../config/database";

jest.mock("../../repositories/media/mediaRepository", () => {
  const originalModule = jest.requireActual("../../repositories/media/mediaRepository");
  return {
    __esModule: true,
    ...originalModule,
    default: {
      ...originalModule.default,
      createMedia: jest.fn(),
      findByCoupleId: jest.fn(),
      findPinnedByCoupleId: jest.fn(),
      findById: jest.fn(),
      updatePinStatus: jest.fn()
    }
  };
});
jest.mock("../../repositories/coupleProfileRepository");
jest.mock("../../services/minio/minio.service");
jest.mock("../../utils/logger");
jest.mock("../../config/database");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";
const mockUser = { id: "user-123" };
const mockToken = jwt.sign(mockUser, ACCESS_TOKEN_SECRET);

describe("Media Controller Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/media/:coupleId", () => {
    it("should upload media successfully", async () => {
      (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ id: "couple-123" });
      (uploadImage as jest.Mock).mockResolvedValue("http://minio/image.jpg");
      (mediaRepository.createMedia as jest.Mock).mockResolvedValue({ id: "media-123", file_url: "http://minio/image.jpg" });

      const response = await request(app)
        .post("/api/media/couple-123")
        .attach("files", Buffer.from("dummy-image"), "test.jpg");

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("1 media file(s) uploaded successfully.");
      expect(mediaRepository.createMedia).toHaveBeenCalled();
    });

    it("should handle video uploads correctly", async () => {
      (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ id: "couple-123" });
      (uploadImage as jest.Mock).mockResolvedValue("http://minio/video.mp4");
      (mediaRepository.createMedia as jest.Mock).mockResolvedValue({ id: "media-123", file_url: "http://minio/video.mp4" });

      const response = await request(app)
        .post("/api/media/couple-123")
        .attach("files", Buffer.from("dummy-video"), { filename: "test.mp4", contentType: "video/mp4" });

      expect(response.status).toBe(201);
      expect(mediaRepository.createMedia).toHaveBeenCalledWith(expect.objectContaining({
        file_type: "video"
      }));
    });

    it("should return 400 if no files uploaded", async () => {
      const response = await request(app)
        .post("/api/media/couple-123");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("No files uploaded.");
    });

    it("should return 404 if couple profile not found", async () => {
      (coupleProfileRepository.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post("/api/media/couple-123")
        .attach("files", Buffer.from("dummy"), "test.jpg");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Couple profile not found.");
    });

    it("should return 500 if an error occurs", async () => {
      (coupleProfileRepository.findById as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const response = await request(app)
        .post("/api/media/couple-123")
        .attach("files", Buffer.from("dummy"), "test.jpg");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Failed to upload media.");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("GET /api/media/admin/my-media", () => {
    it("should fetch admin media successfully", async () => {
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "couple-123" });
      (mediaRepository.findByCoupleId as jest.Mock).mockResolvedValue([{ id: "media-1" }]);

      const response = await request(app)
        .get("/api/media/admin/my-media")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.media).toHaveLength(1);
    });

    it("should return 404 if profile not found", async () => {
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get("/api/media/admin/my-media")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Couple profile not found");
    });

    it("should return 500 if error occurs", async () => {
      (coupleProfileRepository.findByUserId as jest.Mock).mockRejectedValue(new Error("Error"));

      const response = await request(app)
        .get("/api/media/admin/my-media")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it("should return 401 if user ID is missing in request", async () => {

        const response = await request(app)
          .get("/api/media/admin/my-media");
        
        expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/media/admin/pin/:mediaId", () => {
    it("should toggle pin status successfully", async () => {
      (mediaRepository.findById as jest.Mock).mockResolvedValue({ id: "media-1", couple_id: "couple-123" });
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "couple-123" });
      (mediaRepository.updatePinStatus as jest.Mock).mockResolvedValue({ id: "media-1", is_pinned: true });

      const response = await request(app)
        .patch("/api/media/admin/pin/media-1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Media pinned successfully");
    });

    it("should unpin media successfully", async () => {
      (mediaRepository.findById as jest.Mock).mockResolvedValue({ id: "media-1", couple_id: "couple-123" });
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "couple-123" });
      (mediaRepository.updatePinStatus as jest.Mock).mockResolvedValue({ id: "media-1", is_pinned: false });

      const response = await request(app)
        .patch("/api/media/admin/pin/media-1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: false });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Media unpinned successfully");
    });

    it("should return 400 if isPinned is not a boolean", async () => {
      const response = await request(app)
        .patch("/api/media/admin/pin/media-1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: "true" });

      expect(response.status).toBe(400);
    });

    it("should return 404 if media not found", async () => {
      (mediaRepository.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .patch("/api/media/admin/pin/media-1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: true });

      expect(response.status).toBe(404);
    });

    it("should return 403 if user does not own the media", async () => {
      (mediaRepository.findById as jest.Mock).mockResolvedValue({ id: "media-1", couple_id: "couple-456" });
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "couple-123" });

      const response = await request(app)
        .patch("/api/media/admin/pin/media-1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: true });

      expect(response.status).toBe(403);
    });

    it("should return 500 if error occurs", async () => {
      (mediaRepository.findById as jest.Mock).mockRejectedValue(new Error("Error"));

      const response = await request(app)
        .patch("/api/media/admin/pin/media-1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: true });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/media/:coupleId", () => {
    it("should fetch public pinned media successfully", async () => {
      (mediaRepository.findPinnedByCoupleId as jest.Mock).mockResolvedValue([{ id: "media-1" }]);

      const response = await request(app)
        .get("/api/media/couple-123");

      expect(response.status).toBe(200);
      expect(response.body.media).toHaveLength(1);
    });

    it("should return 500 if error occurs", async () => {
      (mediaRepository.findPinnedByCoupleId as jest.Mock).mockRejectedValue(new Error("Error"));

      const response = await request(app)
        .get("/api/media/couple-123");

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/media/all/:coupleId", () => {
    it("should fetch all media successfully", async () => {
      (mediaRepository.findByCoupleId as jest.Mock).mockResolvedValue([{ id: "media-1" }]);

      const response = await request(app)
        .get("/api/media/all/couple-123");

      expect(response.status).toBe(200);
      expect(response.body.media).toHaveLength(1);
    });

    it("should return 500 if error occurs", async () => {
      (mediaRepository.findByCoupleId as jest.Mock).mockRejectedValue(new Error("Error"));

      const response = await request(app)
        .get("/api/media/all/couple-123");

      expect(response.status).toBe(500);
    });
  });

  describe("Direct Controller Calls (Coverage)", () => {
    const { uploadMedia, getAdminMedia, toggleMediaPin, getPublicMedia, getAllMedia } = require("../../controllers/media/mediaController");

    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
      mockReq = {
        params: {},
        body: {},
        user: {}
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it("uploadMedia: missing coupleId", async () => {
      mockReq.params.coupleId = undefined;
      await uploadMedia(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Couple ID is required." });
    });

    it("getAdminMedia: missing userId", async () => {
      mockReq.user = undefined;
      await getAdminMedia(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized: No user ID found" });
    });

    it("toggleMediaPin: missing mediaId", async () => {
      mockReq.params.mediaId = undefined;
      mockReq.body.isPinned = true;
      await toggleMediaPin(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Media ID is required." });
    });

    it("getPublicMedia: missing coupleId", async () => {
      mockReq.params.coupleId = undefined;
      await getPublicMedia(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Couple ID is required." });
    });

    it("getAllMedia: missing coupleId", async () => {
      mockReq.params.coupleId = undefined;
      await getAllMedia(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Couple ID is required." });
    });
  });

  describe("MediaRepository Tests", () => {
    const realMediaRepository = jest.requireActual("../../repositories/media/mediaRepository").default;

    it("createMedia should execute correct query", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "1" }] });
      await realMediaRepository.createMedia({ couple_id: "c1", file_url: "u1", file_type: "image" });
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO media"), ["c1", "u1", "image"]);
    });

    it("findByCoupleId should execute correct query", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
      await realMediaRepository.findByCoupleId("c1");
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("SELECT * FROM media"), ["c1"]);
    });

    it("findPinnedByCoupleId should execute correct query", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
      await realMediaRepository.findPinnedByCoupleId("c1");
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("is_pinned = TRUE"), ["c1"]);
    });

    it("findById should return media if found", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "m1" }] });
      const res = await realMediaRepository.findById("m1");
      expect(res).toEqual({ id: "m1" });
    });

    it("findById should return null if not found", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
      const res = await realMediaRepository.findById("m1");
      expect(res).toBeNull();
    });

    it("updatePinStatus should execute correct query", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "m1" }] });
      await realMediaRepository.updatePinStatus("m1", true);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE media"), [true, "m1"]);
    });
  });
});

