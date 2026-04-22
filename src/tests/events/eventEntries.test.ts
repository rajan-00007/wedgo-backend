import request from "supertest";
import app from "../../app";
import eventAccessRepository from "../../repositories/event-access/eventAccessRepository";
import eventEntriesRepository from "../../repositories/events/eventEntriesRepository";
import jwt from "jsonwebtoken";

jest.mock("../../repositories/event-access/eventAccessRepository");
jest.mock("../../repositories/events/eventEntriesRepository");
jest.mock("../../utils/logger");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";
const mockUser = { id: "user-123" };
const mockToken = jwt.sign(mockUser, ACCESS_TOKEN_SECRET);

describe("Event Entries Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/event/entry", () => {
    it("should record entry successfully", async () => {
      (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue({ couple_id: "c1", id: "acc-1" });
      (eventEntriesRepository.recordEntry as jest.Mock).mockResolvedValue({ id: "entry-1" });

      const response = await request(app)
        .post("/api/event/entry")
        .send({ token: "t1", userDeviceId: "d1" });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Entry recorded");
    });

    it("should handle duplicate entries gracefully", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue({ couple_id: "c1", id: "acc-1" });
        (eventEntriesRepository.recordEntry as jest.Mock).mockResolvedValue(null);
  
        const response = await request(app)
          .post("/api/event/entry")
          .send({ token: "t1", userDeviceId: "d1" });
  
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Already counted");
    });

    it("should return 400 if validation fails", async () => {
        const response = await request(app)
          .post("/api/event/entry")
          .send({ token: "t1" });
  
        expect(response.status).toBe(400);
    });

    it("should return 404 if token not found", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockResolvedValue(null);
        const response = await request(app)
          .post("/api/event/entry")
          .send({ token: "t1", userDeviceId: "d1" });
  
        expect(response.status).toBe(404);
    });

    it("should return 500 if database fails", async () => {
        (eventAccessRepository.findByToken as jest.Mock).mockRejectedValue(new Error("DB Error"));
        const response = await request(app)
          .post("/api/event/entry")
          .send({ token: "t1", userDeviceId: "d1" });
  
        expect(response.status).toBe(500);
    });
  });

  describe("GET /api/event/entries/stats", () => {
    it("should return entry stats successfully", async () => {
      (eventEntriesRepository.getUniqueUsersCountAcrossAllCouples as jest.Mock).mockResolvedValue(100);
      (eventEntriesRepository.getCountsGroupedByCouple as jest.Mock).mockResolvedValue([{ couple_id: "c1", count: 10 }]);

      const response = await request(app)
        .get("/api/event/entries/stats")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalUniqueUsers).toBe(100);
    });

    it("should return 500 if database fails", async () => {
        (eventEntriesRepository.getUniqueUsersCountAcrossAllCouples as jest.Mock).mockRejectedValue(new Error("DB Error"));
        const response = await request(app)
          .get("/api/event/entries/stats")
          .set("Authorization", `Bearer ${mockToken}`);

        expect(response.status).toBe(500);
    });
  });

  describe("GET /api/event/entries/:coupleId/count", () => {
    it("should return couple entry count successfully", async () => {
      (eventEntriesRepository.getCountByCouple as jest.Mock).mockResolvedValue(50);

      const response = await request(app)
        .get("/api/event/entries/c1/count")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(50);
    });

    it("should return 500 if database fails", async () => {
        (eventEntriesRepository.getCountByCouple as jest.Mock).mockRejectedValue(new Error("DB Error"));
        const response = await request(app)
          .get("/api/event/entries/c1/count")
          .set("Authorization", `Bearer ${mockToken}`);

        expect(response.status).toBe(500);
    });

    it("should return 400 if coupleId missing", async () => {
        const req = { params: {} } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        const { getCoupleEntryCount } = require("../../controllers/events/eventEntriesController");
        await getCoupleEntryCount(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
