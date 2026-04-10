import request from "supertest";
import app from "../../app";
import pool from "../../config/database";
import jwt from "jsonwebtoken";
import * as minioService from "../../services/minio/minio.service";
import { createBlessingValidator } from "../../validators/blessings/blessingValidator";
import { getPublicBlessings, toggleBlessingPin } from "../../controllers/blessings/blessingsController";
import { createBlessing } from "../../controllers/blessings/createBlessing";

// Mock dependencies
jest.mock("../../config/database");
jest.mock("../../services/minio/minio.service");

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
      const mockProfile = { id: coupleId };
      const mockBlessing = { 
        id: "blessing-1", 
        couple_id: coupleId, 
        name: "John", 
        message: "Congrats!" 
      };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockProfile] }) // Profile exists
        .mockResolvedValueOnce({ rows: [mockBlessing] }); // Blessing created

      const response = await request(app)
        .post(`/api/blessings/${coupleId}`)
        .send({ name: "John", message: "Congrats!" });

      expect(response.status).toBe(201);
      expect(response.body.blessing.name).toBe("John");
    });

    it("should create a blessing successfully with an image upload", async () => {
      const mockProfile = { id: coupleId };
      const mockBlessing = { 
        id: "blessing-2", 
        couple_id: coupleId, 
        name: "Doe", 
        message: "Happy Wedding!",
        image_url: "blessings/image.jpg"
      };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockProfile] })
        .mockResolvedValueOnce({ rows: [mockBlessing] });

      (minioService.uploadImage as jest.Mock).mockResolvedValueOnce("blessings/image.jpg");

      const response = await request(app)
        .post(`/api/blessings/${coupleId}`)
        .attach("image_url", Buffer.from("fake-image"), "test.jpg")
        .field("name", "Doe")
        .field("message", "Happy Wedding!");

      expect(response.status).toBe(201);
      expect(response.body.blessing.image_url).toBe("blessings/image.jpg");
    });

    it("should return 404 if couple profile is not found", async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Profile not found

      const response = await request(app)
        .post(`/api/blessings/${coupleId}`)
        .send({ name: "John", message: "Congrats!" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Couple profile not found.");
    });

    it("should return 400 for validation failure", async () => {
      const response = await request(app)
        .post(`/api/blessings/${coupleId}`)
        .send({ name: "J", message: "" }); // Name too short, message empty

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed.");
    });

    it("should return 500 if database fails during profile check", async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

      const response = await request(app)
        .post(`/api/blessings/${coupleId}`)
        .send({ name: "John", message: "Congrats!" });

      expect(response.status).toBe(500);
    });

    it("should return 400 if validation parsing throws a non-ZodError", async () => {
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

    it("should return 400 if coupleId is missing (Direct Call)", async () => {
      const req = { params: { coupleId: "" }, body: { name: "John", message: "Congrats!" } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await createBlessing(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Couple ID is required and must be a string." });
    });
  });

  describe("GET /api/blessings/:coupleId", () => {
    const coupleId = "couple-123";

    it("should return ONLY pinned blessings for guests", async () => {
      const mockPinnedBlessings = [
        { id: "b1", is_pinned: true, name: "Donor 1" },
        { id: "b2", is_pinned: true, name: "Donor 2" }
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockPinnedBlessings });

      const response = await request(app).get(`/api/blessings/${coupleId}`);

      expect(response.status).toBe(200);
      expect(response.body.blessings).toHaveLength(2);
      expect(response.body.blessings.every((b: any) => b.is_pinned)).toBe(true);
    });

    it("should return 500 if database fails", async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

      const response = await request(app).get(`/api/blessings/${coupleId}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Failed to fetch blessings.");
    });

    it("should return 400 if coupleId is missing (Direct Call)", async () => {
      const req = { params: { coupleId: "" } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await getPublicBlessings(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Couple ID is required." });
    });
  });

  describe("GET /api/blessings/admin/my-blessings", () => {
    it("should return all blessings for the authenticated admin", async () => {
      const mockProfile = { id: "couple-123", user_id: mockUser.id };
      const mockAllBlessings = [
        { id: "b1", is_pinned: true },
        { id: "b2", is_pinned: false }
      ];

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockProfile] }) // Find profile by user ID
        .mockResolvedValueOnce({ rows: mockAllBlessings }); // Find all blessings by couple ID

      const response = await request(app)
        .get("/api/blessings/admin/my-blessings")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.blessings).toHaveLength(2);
    });

    it("should return 404 if admin profile is not found", async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/blessings/admin/my-blessings")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });

    it("should return 401 if user ID is missing in token (mocked)", async () => {
      const tokenNoId = jwt.sign({ phoneNumber: "12345" }, ACCESS_TOKEN_SECRET);
      
      const response = await request(app)
        .get("/api/blessings/admin/my-blessings")
        .set("Authorization", `Bearer ${tokenNoId}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("No user ID found");
    });

    it("should return 500 if database fails", async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

      const response = await request(app)
        .get("/api/blessings/admin/my-blessings")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe("PATCH /api/blessings/admin/pin/:blessingId", () => {
    const blessingId = "blessing-123";

    it("should successfully pin a blessing", async () => {
      const mockBlessing = { id: blessingId, couple_id: "couple-123", is_pinned: false };
      const mockProfile = { id: "couple-123", user_id: mockUser.id };
      const mockUpdatedBlessing = { ...mockBlessing, is_pinned: true };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockBlessing] }) // Find blessing
        .mockResolvedValueOnce({ rows: [mockProfile] })  // Find user's profile
        .mockResolvedValueOnce({ rows: [mockUpdatedBlessing] }); // Update status

      const response = await request(app)
        .patch(`/api/blessings/admin/pin/${blessingId}`)
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: true });

      expect(response.status).toBe(200);
      expect(response.body.blessing.is_pinned).toBe(true);
    });

    it("should successfully unpin a blessing", async () => {
      const mockBlessing = { id: blessingId, couple_id: "couple-123", is_pinned: true };
      const mockProfile = { id: "couple-123", user_id: mockUser.id };
      const mockUpdatedBlessing = { ...mockBlessing, is_pinned: false };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockBlessing] })
        .mockResolvedValueOnce({ rows: [mockProfile] })
        .mockResolvedValueOnce({ rows: [mockUpdatedBlessing] });

      const response = await request(app)
        .patch(`/api/blessings/admin/pin/${blessingId}`)
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: false });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Blessing unpinned successfully");
      expect(response.body.blessing.is_pinned).toBe(false);
    });

    it("should return 403 if blessing does not belong to admin", async () => {
      const mockBlessing = { id: blessingId, couple_id: "other-couple" };
      const mockProfile = { id: "couple-123", user_id: mockUser.id };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockBlessing] })
        .mockResolvedValueOnce({ rows: [mockProfile] });

      const response = await request(app)
        .patch(`/api/blessings/admin/pin/${blessingId}`)
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: true });

      expect(response.status).toBe(403);
    });

    it("should return 400 if isPinned is not a boolean", async () => {
      const response = await request(app)
        .patch(`/api/blessings/admin/pin/${blessingId}`)
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: "yes" });

      expect(response.status).toBe(400);
    });

    it("should return 404 if blessing not found", async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .patch(`/api/blessings/admin/pin/${blessingId}`)
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: true });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Blessing not found");
    });

    it("should return 401 if user ID is missing in token", async () => {
      const tokenNoId = jwt.sign({ phoneNumber: "12345" }, ACCESS_TOKEN_SECRET);

      const response = await request(app)
        .patch(`/api/blessings/admin/pin/${blessingId}`)
        .set("Authorization", `Bearer ${tokenNoId}`)
        .send({ isPinned: true });

      expect(response.status).toBe(401);
    });

    it("should return 500 if database fails", async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

      const response = await request(app)
        .patch(`/api/blessings/admin/pin/${blessingId}`)
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ isPinned: true });

      expect(response.status).toBe(500);
    });

    it("should return 400 if blessingId is missing (Direct Call)", async () => {
      const req = { params: { blessingId: "" }, body: { isPinned: true }, user: { id: "123" } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await toggleBlessingPin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
