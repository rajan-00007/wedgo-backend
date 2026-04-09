import request from "supertest";
import app from "../../app";
import pool from "../../config/database";
import jwt from "jsonwebtoken";
import { createEventValidator, updateEventValidator } from "../../validators/events/eventValidator";
import eventsRepository from "../../repositories/events/eventsRepository";

// Mock the database pool
jest.mock("../../config/database");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";

const mockUser = { id: "user-123", phoneNumber: "1234567890" };
const mockToken = jwt.sign(mockUser, ACCESS_TOKEN_SECRET);

describe("Events CRUD Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/events", () => {
    it("should create a new event successfully", async () => {
      const mockProfile = { id: "profile-123", user_id: "user-123" };
      const mockEvent = { 
        id: "event-123", 
        couple_id: "profile-123",
        name: "Wedding", 
        event_date: "2027-12-25",
        start_time: "10:00:00",
        end_time: "12:00:00",
        location: "Grand Hall"
      };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockProfile] }) // For coupleProfileRepository.findByUserId
        .mockResolvedValueOnce({ rows: [mockEvent] }); // For eventsRepository.createEvent

      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          name: "Wedding",
          event_date: "2027-12-25",
          start_time: "10:00:00",
          end_time: "12:00:00",
          location: "Grand Hall"
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Event created successfully.");
      expect(response.body.event.name).toBe("Wedding");
    });

    it("should return 400 if name is missing", async () => {
      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ 
          event_date: "2027-12-25",
          start_time: "10:00:00",
          end_time: "12:00:00",
          location: "Grand Hall"
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed.");
    });

    it("should return 404 if couple profile is not found", async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Profile not found

      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          name: "Wedding",
          event_date: "2027-12-25",
          start_time: "10:00:00",
          end_time: "12:00:00",
          location: "Grand Hall"
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Couple profile not found. Please create a profile first.");
    });

    it("should return 500 if database fails", async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          name: "Wedding",
          event_date: "2027-12-25",
          start_time: "10:00:00",
          end_time: "12:00:00",
          location: "Grand Hall"
        });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/events", () => {
    it("should fetch all events for the user's couple profile", async () => {
      const mockProfile = { id: "profile-123" };
      const mockEvents = [
        { id: "event-1", name: "Haldi", event_date: "2024-12-24" }
      ];

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockProfile] })
        .mockResolvedValueOnce({ rows: mockEvents });

      const response = await request(app)
        .get("/api/events")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(1);
    });

    it("should return 404 if profile is not found", async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/events")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });

    it("should return 500 if database fails", async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

      const response = await request(app)
        .get("/api/events")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/events/:id", () => {
    it("should fetch a single event by ID", async () => {
      const mockEvent = { id: "event-1", name: "Haldi" };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockEvent] });

      const response = await request(app)
        .get("/api/events/event-1")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.event.id).toBe("event-1");
    });

    it("should return 404 if event is not found", async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/events/unknown-id")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Event not found.");
    });

    it("should return 500 if database fails", async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

      const response = await request(app)
        .get("/api/events/event-1")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe("PATCH /api/events/:id", () => {
    it("should update an event successfully", async () => {
      const mockUpdatedEvent = { id: "event-1", name: "Updated Haldi" };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdatedEvent] });

      const response = await request(app)
        .patch("/api/events/event-1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ name: "Updated Haldi" });

      expect(response.status).toBe(200);
      expect(response.body.event.name).toBe("Updated Haldi");
    });

    it("should return 400 for validation failure", async () => {
      const response = await request(app)
        .patch("/api/events/event-1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ event_date: "2000-01-01" }); // Past date

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed.");
    });

    it("should return 404 if event to update is not found", async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .patch("/api/events/non-existent")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ name: "New Name" });

      expect(response.status).toBe(404);
    });

    it("should return 404 if update body is empty", async () => {
      const response = await request(app)
        .patch("/api/events/event-1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({});

      expect(response.status).toBe(404);
    });

    it("should return 500 if database fails", async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

      const response = await request(app)
        .patch("/api/events/event-1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ name: "Error Test" });

      expect(response.status).toBe(500);
    });
  });

  describe("DELETE /api/events/:id", () => {
    it("should delete an event successfully", async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .delete("/api/events/event-1")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Event deleted successfully.");
    });

    it("should return 404 if event to delete is not found", async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      const response = await request(app)
        .delete("/api/events/non-existent")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });

    it("should return 500 if database fails", async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

      const response = await request(app)
        .delete("/api/events/event-1")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
    });

    it("should handle unexpected errors during delete rowCount check", async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: null }); // Trigger ?? 0

      const response = await request(app)
        .delete("/api/events/event-1")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("Edge Case Internal Error Handling", () => {
    it("should handle non-Zod errors in createEvent validation catch block", async () => {
      const spy = jest.spyOn(createEventValidator, "parse").mockImplementation(() => {
        throw new Error("Unexpected Error");
      });

      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ name: "Test" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid request data.");
      spy.mockRestore();
    });

    it("should handle non-Zod errors in updateEvent validation catch block", async () => {
      const spy = jest.spyOn(updateEventValidator, "parse").mockImplementation(() => {
        throw new Error("Unexpected Error");
      });

      const response = await request(app)
        .patch("/api/events/event-1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ name: "Test" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid request data.");
      spy.mockRestore();
    });
  });

  describe("Repository Logical Branches", () => {
    it("should handle undefined fields in createEvent (repository direct call)", async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: "1" }] });
      
      await eventsRepository.createEvent({
        couple_id: "p1",
        name: "Test",
        event_date: "2027-01-01",
        start_time: undefined, // Trigger || null
        end_time: undefined,   // Trigger || null
        location: undefined    // Trigger || null
      });

      expect(pool.query).toHaveBeenCalled();
    });
  });
});
