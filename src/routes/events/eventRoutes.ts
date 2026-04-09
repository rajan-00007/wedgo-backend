import { Router } from "express";
import eventsController from "../../controllers/events/eventsController";
import { authenticateToken } from "../../middlewares/auth/authMiddleware";

const router = Router();

// Create a new event
router.post("/", authenticateToken, (req, res) => eventsController.createEvent(req, res));

// Get all events for the authenticated user's couple profile
router.get("/", authenticateToken, (req, res) => eventsController.getEvents(req, res));

// Get a specific event by ID
router.get("/:id", authenticateToken, (req, res) => eventsController.getEventById(req, res));

// Update an existing event
router.patch("/:id", authenticateToken, (req, res) => eventsController.updateEvent(req, res));

// Delete an event
router.delete("/:id", authenticateToken, (req, res) => eventsController.deleteEvent(req, res));

export default router;
