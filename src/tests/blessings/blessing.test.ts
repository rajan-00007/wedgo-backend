import request from "supertest";
import app from "../../app";
import jwt from "jsonwebtoken";
import * as minioService from "../../services/minio/minio.service";
import { createBlessingValidator } from "../../validators/blessings/blessingValidator";
import { getPublicBlessings, toggleBlessingPin, getAllBlessings, likeBlessing, getAdminBlessings } from "../../controllers/blessings/blessingsController";
import { createBlessing } from "../../controllers/blessings/createBlessing";

import blessingRepositories from "../../repositories/blessings/blessingRepositories";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";

// Mock dependencies
jest.mock("../../services/minio/minio.service");
jest.mock("../../repositories/blessings/blessingRepositories");
jest.mock("../../repositories/coupleProfileRepository");
jest.mock("../../utils/logger");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";
const mockUser = { id: "user-123", phoneNumber: "1234567890" };
const mockToken = jwt.sign(mockUser, ACCESS_TOKEN_SECRET);

describe("Blessings API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/blessings/:coupleId", () => {
    const coupleId = "couple-123";

    it("should create a blessing successfully without an image", async () => {
      (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ id: coupleId });
      (blessingRepositories.createBlessing as jest.Mock).mockResolvedValue({ 
        id: "blessing-1", 
        couple_id: coupleId, 
        name: "John", 
        message: "Congrats!" 
      });

      const response = await request(app)
        .post(`/api/blessings/${coupleId}`)
        .send({ name: "John", message: "Congrats!" });

      expect(response.status).toBe(201);
      expect(response.body.blessing.name).toBe("John");
    });

    it("should create a blessing successfully with an image upload", async () => {
      (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ id: coupleId });
      (minioService.uploadImage as jest.Mock).mockResolvedValue("blessings/image.jpg");
      (blessingRepositories.createBlessing as jest.Mock).mockResolvedValue({ 
        id: "blessing-2", 
        couple_id: coupleId, 
        name: "Doe", 
        message: "Happy Wedding!",
        image_url: "blessings/image.jpg"
      });

      const response = await request(app)
        .post(`/api/blessings/${coupleId}`)
        .attach("image_url", Buffer.from("fake-image"), "test.jpg")
        .field("name", "Doe")
        .field("message", "Happy Wedding!");

      expect(response.status).toBe(201);
      expect(response.body.blessing.image_url).toContain("blessings/image.jpg");
    });

    it("should return 404 if couple profile is not found", async () => {
      (coupleProfileRepository.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/blessings/${coupleId}`)
        .send({ name: "John", message: "Congrats!" });

      expect(response.status).toBe(404);
    });

    it("should return 400 for validation failure", async () => {
      const response = await request(app)
        .post(`/api/blessings/${coupleId}`)
        .send({ name: "J", message: "" });

      expect(response.status).toBe(400);
    });

    it("should return 500 if database fails during profile check", async () => {
      (coupleProfileRepository.findById as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const response = await request(app)
        .post(`/api/blessings/${coupleId}`)
        .send({ name: "John", message: "Congrats!" });

      expect(response.status).toBe(500);
    });

    it("should handle createBlessing returning null", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ id: coupleId });
        (blessingRepositories.createBlessing as jest.Mock).mockResolvedValue(null);
  
        const response = await request(app)
          .post(`/api/blessings/${coupleId}`)
          .send({ name: "Alice", message: "Congrats!" });
  
        expect(response.status).toBe(201);
    });

    it("should handle validation parsing throws a non-ZodError", async () => {
      const spy = jest.spyOn(createBlessingValidator, 'parse').mockImplementation(() => {
        throw new Error("Generic Error");
      });

      const response = await request(app)
        .post(`/api/blessings/${coupleId}`)
        .send({ name: "John", message: "Congrats!" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid request data.");
      spy.mockRestore();
    });

    it("should return 400 if coupleId is missing or invalid", async () => {
        const req = { params: { coupleId: 123 }, body: { name: "John", message: "Congrats!" }, headers: {} } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        await createBlessing(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("GET /api/blessings/:coupleId", () => {
    it("should return ONLY pinned blessings for guests", async () => {
      (blessingRepositories.findPinnedByCoupleId as jest.Mock).mockResolvedValue([
        { id: "b1", is_pinned: true, name: "Donor 1" },
        { id: "b2", is_pinned: true, name: "Donor 2" }
      ]);

      const response = await request(app).get("/api/blessings/c1");

      expect(response.status).toBe(200);
      expect(response.body.blessings).toHaveLength(2);
    });

    it("should return 500 if database fails", async () => {
      (blessingRepositories.findPinnedByCoupleId as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const response = await request(app).get("/api/blessings/c1");

      expect(response.status).toBe(500);
    });

    it("should return 400 if coupleId is missing (Direct Call)", async () => {
        const req = { params: { coupleId: undefined }, headers: {} } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        await getPublicBlessings(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("GET /api/blessings/admin/my-blessings", () => {
    it("should return all blessings for the authenticated admin", async () => {
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "c1" });
      (blessingRepositories.findByCoupleId as jest.Mock).mockResolvedValue([{ id: "b1" }]);

      const response = await request(app)
        .get("/api/blessings/admin/my-blessings")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.blessings).toHaveLength(1);
    });

    it("should return 404 if admin profile is not found", async () => {
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get("/api/blessings/admin/my-blessings")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });

    it("should return 401 if user ID is missing", async () => {
        const req = { user: {}, headers: {} } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        await getAdminBlessings(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 500 if database fails", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockRejectedValue(new Error("DB Error"));
        const response = await request(app)
          .get("/api/blessings/admin/my-blessings")
          .set("Authorization", `Bearer ${mockToken}`);
        expect(response.status).toBe(500);
    });
  });

  describe("POST /api/blessings/like/:blessingId", () => {
    it("should successfully like a blessing", async () => {
      const response = await request(app)
        .post("/api/blessings/like/b1")
        .set("x-device-id", "d1");

      expect(response.status).toBe(200);
    });

    it("should return 400 if device-id header is missing", async () => {
        const response = await request(app)
          .post("/api/blessings/like/b1");
  
        expect(response.status).toBe(400);
    });

    it("should return 500 if database fails", async () => {
        (blessingRepositories.likeBlessing as jest.Mock).mockRejectedValue(new Error("DB Error"));
        const response = await request(app)
          .post("/api/blessings/like/b1")
          .set("x-device-id", "d1");
        expect(response.status).toBe(500);
    });
  });

  describe("GET /api/blessings/all/:coupleId", () => {
    it("should fetch all blessings successfully", async () => {
        (blessingRepositories.findByCoupleId as jest.Mock).mockResolvedValue([{ id: "b1" }]);

        const response = await request(app)
          .get("/api/blessings/all/c1")
          .set("x-device-id", "d1");

        expect(response.status).toBe(200);
    });

    it("should return 500 if database fails", async () => {
        (blessingRepositories.findByCoupleId as jest.Mock).mockRejectedValue(new Error("DB Error"));
        const response = await request(app)
          .get("/api/blessings/all/c1");
        expect(response.status).toBe(500);
    });
  });

  describe("PATCH /api/blessings/admin/pin/:blessingId", () => {
    it("should successfully pin a blessing", async () => {
      (blessingRepositories.findById as jest.Mock).mockResolvedValue({ couple_id: "c1" });
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "c1", user_id: mockUser.id });
      (blessingRepositories.updatePinStatus as jest.Mock).mockResolvedValue({ id: "b1", is_pinned: true });

      const response = await request(app)
        .patch("/api/blessings/admin/pin/b1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: true });

      expect(response.status).toBe(200);
    });

    it("should return 401 if user ID is missing", async () => {
        const req = { user: {}, params: { blessingId: "b1" }, body: { isPinned: true } } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        await toggleBlessingPin(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 400 if isPinned is not boolean", async () => {
        const response = await request(app)
          .patch("/api/blessings/admin/pin/b1")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ isPinned: "invalid" });
        expect(response.status).toBe(400);
    });

    it("toggleBlessingPin: blessing not found", async () => {
        (blessingRepositories.findById as jest.Mock).mockResolvedValue(null);
        const response = await request(app)
          .patch("/api/blessings/admin/pin/b1")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ isPinned: true });
        expect(response.status).toBe(404);
    });

    it("toggleBlessingPin: forbidden", async () => {
        (blessingRepositories.findById as jest.Mock).mockResolvedValue({ couple_id: "other" });
        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "mine" });
        const response = await request(app)
          .patch("/api/blessings/admin/pin/b1")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ isPinned: true });
        expect(response.status).toBe(403);
    });

    it("toggleBlessingPin: missing blessingId", async () => {
        const req = { params: {}, user: { id: "123" }, body: { isPinned: true } } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        await toggleBlessingPin(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 if database fails in toggle", async () => {
        (blessingRepositories.findById as jest.Mock).mockRejectedValue(new Error("DB Error"));
        const response = await request(app)
          .patch("/api/blessings/admin/pin/b1")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ isPinned: true });
        expect(response.status).toBe(500);
    });
  });

  describe("Direct Controller Calls (Coverage)", () => {
    it("getAllBlessings: missing coupleId", async () => {
        const req = { params: {}, headers: {} } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        await getAllBlessings(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("likeBlessing: missing blessingId", async () => {
        const req = { params: {}, headers: { 'x-device-id': 'd1' } } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        await likeBlessing(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
