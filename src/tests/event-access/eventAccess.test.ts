import request from "supertest";
import app from "../../app";
import eventAccessRepository from "../../repositories/event-access/eventAccessRepository";
import eventsRepository from "../../repositories/events/eventsRepository";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import * as minioService from "../../services/minio/minio.service";
import jwt from "jsonwebtoken";

jest.mock("../../repositories/event-access/eventAccessRepository");
jest.mock("../../repositories/events/eventsRepository");
jest.mock("../../repositories/coupleProfileRepository");
jest.mock("../../services/minio/minio.service");
jest.mock("../../utils/logger");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";
const mockUser = { id: "user-123" };
const mockToken = jwt.sign(mockUser, ACCESS_TOKEN_SECRET);

describe("Event Access Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/generate-full-access", () => {
    it("should generate new full access successfully", async () => {
      (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ user_id: "user-123" });
      (eventAccessRepository.findByCoupleAndType as jest.Mock).mockResolvedValue(null);
      (minioService.uploadBuffer as jest.Mock).mockResolvedValue("qr.png");
      (eventAccessRepository.createAccess as jest.Mock).mockResolvedValue({ id: "acc-1" });

      const response = await request(app)
        .get("/api/generate-full-access")
        .query({ coupleId: "c1" })
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("New access generated");
    });

    it("should retrieve existing full access successfully", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ user_id: "user-123" });
        (eventAccessRepository.findByCoupleAndType as jest.Mock).mockResolvedValue({ token: "t1", qr_image_url: "qr.png" });
  
        const response = await request(app)
          .get("/api/generate-full-access")
          .query({ coupleId: "c1" })
          .set("Authorization", `Bearer ${mockToken}`);
  
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Existing access retrieved");
    });

    it("should retrieve existing full access and generate QR if missing (Line 42)", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ user_id: "user-123" });
        (eventAccessRepository.findByCoupleAndType as jest.Mock).mockResolvedValue({ token: "t1", qr_image_url: null });
  
        const response = await request(app)
          .get("/api/generate-full-access")
          .query({ coupleId: "c1" })
          .set("Authorization", `Bearer ${mockToken}`);
  
        expect(response.status).toBe(200);
        expect(response.body.qrCode).toBeDefined();
    });

    it("should return 400 if coupleId missing", async () => {
        const response = await request(app)
          .get("/api/generate-full-access")
          .set("Authorization", `Bearer ${mockToken}`);
  
        expect(response.status).toBe(400);
    });

    it("should return 404 if profile not found", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue(null);
        const response = await request(app)
          .get("/api/generate-full-access")
          .query({ coupleId: "c1" })
          .set("Authorization", `Bearer ${mockToken}`);
  
        expect(response.status).toBe(404);
    });

    it("should return 403 if user doesn't own profile", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ user_id: "other" });
        const response = await request(app)
          .get("/api/generate-full-access")
          .query({ coupleId: "c1" })
          .set("Authorization", `Bearer ${mockToken}`);
  
        expect(response.status).toBe(403);
    });

    it("should return 401 if user ID missing", async () => {
        const req = { query: { coupleId: "c1" }, user: {} } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        const { generateFullAccess } = require("../../controllers/event-access/eventAccessController");
        await generateFullAccess(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 500 if error occurs", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockRejectedValue(new Error("DB Error"));
        const response = await request(app)
          .get("/api/generate-full-access")
          .query({ coupleId: "c1" })
          .set("Authorization", `Bearer ${mockToken}`);
  
        expect(response.status).toBe(500);
    });
  });

  describe("POST /api/generate-custom-access", () => {
    it("should generate custom access successfully", async () => {
      (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ user_id: "user-123" });
      (eventsRepository.areEventsOwnedByCouple as jest.Mock).mockResolvedValue(true);
      (minioService.uploadBuffer as jest.Mock).mockResolvedValue("qr.png");
      (eventAccessRepository.createAccess as jest.Mock).mockResolvedValue({ id: "acc-1" });

      const response = await request(app)
        .post("/api/generate-custom-access")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ coupleId: "c1", eventIds: ["e1"] });

      expect(response.status).toBe(201);
      expect(eventAccessRepository.addEventsToAccess).toHaveBeenCalled();
    });

    it("should return 400 if validation fails", async () => {
        const response = await request(app)
          .post("/api/generate-custom-access")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ coupleId: "c1" });
  
        expect(response.status).toBe(400);
    });

    it("should return 404 if profile not found (Line 91)", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue(null);
        const response = await request(app)
          .post("/api/generate-custom-access")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ coupleId: "c1", eventIds: ["e1"] });
        expect(response.status).toBe(404);
    });

    it("should return 403 if user doesn't own profile (Line 95)", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ user_id: "other" });
        const response = await request(app)
          .post("/api/generate-custom-access")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ coupleId: "c1", eventIds: ["e1"] });
        expect(response.status).toBe(403);
    });

    it("should return 401 if user ID missing", async () => {
        const req = { body: { coupleId: "c1", eventIds: ["e1"] }, user: {} } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        const { generateCustomAccess } = require("../../controllers/event-access/eventAccessController");
        await generateCustomAccess(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 400 if events not owned by couple", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ user_id: "user-123" });
        (eventsRepository.areEventsOwnedByCouple as jest.Mock).mockResolvedValue(false);
  
        const response = await request(app)
          .post("/api/generate-custom-access")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ coupleId: "c1", eventIds: ["e1"] });
  
        expect(response.status).toBe(400);
    });

    it("should return 500 if catch block hit (Lines 127-128)", async () => {
        (coupleProfileRepository.findById as jest.Mock).mockRejectedValue(new Error("Generic Error"));
        const response = await request(app)
          .post("/api/generate-custom-access")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ coupleId: "c1", eventIds: ["e1"] });
        expect(response.status).toBe(500);
    });
  });

  describe("GET /api/event", () => {
    it("should return events for 'all' access", async () => {
      (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue({ access_type: "all", couple_id: "c1" });
      (eventsRepository.findByCoupleId as jest.Mock).mockResolvedValue([{ id: "e1" }]);

      const response = await request(app)
        .get("/api/event")
        .query({ token: "t1" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it("should return 400 if token missing", async () => {
        const response = await request(app)
          .get("/api/event");
        expect(response.status).toBe(400);
    });

    it("should return 403 for unsupported access type", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue({ access_type: "other", couple_id: "c1" });
        const response = await request(app)
          .get("/api/event")
          .query({ token: "t1" });
        expect(response.status).toBe(403);
    });

    it("should return 500 if error occurs", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockRejectedValue(new Error("DB Error"));
        const response = await request(app)
          .get("/api/event")
          .query({ token: "t1" });
        expect(response.status).toBe(500);
    });

    it("should return events for 'custom' access", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue({ id: "acc-1", access_type: "custom" });
        (eventAccessRepository.getMappedEvents as jest.Mock).mockResolvedValue([{ id: "e1" }]);
  
        const response = await request(app)
          .get("/api/event")
          .query({ token: "t1" });
  
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
    });

    it("should return 403 for invalid token", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue(null);
        const response = await request(app)
          .get("/api/event")
          .query({ token: "t1" });
        expect(response.status).toBe(403);
    });

    it("should return 403 for expired token", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue({ expires_at: "2000-01-01" });
        const response = await request(app)
          .get("/api/event")
          .query({ token: "t1" });
        expect(response.status).toBe(403);
    });
  });

  describe("GET /api/event/welcome", () => {
    it("should return welcome data successfully (Line 197 mapping)", async () => {
      (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue({ couple_id: "c1" });
      (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({
        partner1_name: "Alice",
        partner2_name: "Bob",
        event_date: "2024-12-31",
        custom_wallpaper_urls: ["wall1.jpg"]
      });

      const response = await request(app)
        .get("/api/event/welcome")
        .query({ token: "t1" });

      expect(response.status).toBe(200);
      expect(response.body.partner1_name).toBe("Alice");
      expect(response.body.custom_wallpaper_urls).toHaveLength(1);
    });

    it("should return welcome data successfully with NO custom wallpapers (Line 197 branch)", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue({ couple_id: "c1" });
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({
          partner1_name: "Alice",
          partner2_name: "Bob",
          event_date: "2024-12-31",
          custom_wallpaper_urls: null
        });
  
        const response = await request(app)
          .get("/api/event/welcome")
          .query({ token: "t1" });
  
        expect(response.status).toBe(200);
        expect(response.body.custom_wallpaper_urls).toEqual([]);
    });

    it("should return 400 if token missing", async () => {
        const response = await request(app)
          .get("/api/event/welcome");
        expect(response.status).toBe(400);
    });

    it("should return 403 if invalid token (Line 179)", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue(null);
        const response = await request(app)
          .get("/api/event/welcome")
          .query({ token: "invalid" });
        expect(response.status).toBe(403);
    });

    it("should return 403 if expired token (Line 183)", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue({ expires_at: "2000-01-01" });
        const response = await request(app)
          .get("/api/event/welcome")
          .query({ token: "expired" });
        expect(response.status).toBe(403);
    });

    it("should return 404 if profile not found", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue({ couple_id: "c1" });
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue(null);
        const response = await request(app)
          .get("/api/event/welcome")
          .query({ token: "t1" });
        expect(response.status).toBe(404);
    });

    it("should return 500 if error occurs (Line 197 catch)", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockRejectedValue(new Error("DB Error"));
        const response = await request(app)
          .get("/api/event/welcome")
          .query({ token: "t1" });
        expect(response.status).toBe(500);
    });
  });

  describe("FRONTEND_URL Fallbacks (Lines 35, 105)", () => {
    it("should use localhost if FRONTEND_URL is missing in generateFullAccess", async () => {
        const originalUrl = process.env.FRONTEND_URL;
        delete process.env.FRONTEND_URL;
        
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ user_id: "user-123" });
        (eventAccessRepository.findByCoupleAndType as jest.Mock).mockResolvedValue(null);
        (minioService.uploadBuffer as jest.Mock).mockResolvedValue("qr.png");

        const response = await request(app)
          .get("/api/generate-full-access")
          .query({ coupleId: "c1" })
          .set("Authorization", `Bearer ${mockToken}`);

        expect(response.body.url).toContain("http://localhost:3000");
        
        process.env.FRONTEND_URL = originalUrl;
    });

    it("should use localhost if FRONTEND_URL is missing in generateCustomAccess", async () => {
        const originalUrl = process.env.FRONTEND_URL;
        delete process.env.FRONTEND_URL;
        
        (coupleProfileRepository.findById as jest.Mock).mockResolvedValue({ user_id: "user-123" });
        (eventsRepository.areEventsOwnedByCouple as jest.Mock).mockResolvedValue(true);
        (minioService.uploadBuffer as jest.Mock).mockResolvedValue("qr.png");
        (eventAccessRepository.createAccess as jest.Mock).mockResolvedValue({ id: "acc-1" });

        const response = await request(app)
          .post("/api/generate-custom-access")
          .set("Authorization", `Bearer ${mockToken}`)
          .send({ coupleId: "c1", eventIds: ["e1"] });

        expect(response.body.url).toContain("http://localhost:3000");
        
        process.env.FRONTEND_URL = originalUrl;
    });
  });
});
