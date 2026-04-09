import { Request, Response } from "express";
import eventsRepository from "../../repositories/events/eventsRepository";
import logger from "../../utils/logger";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import { createEventValidator, updateEventValidator } from "../../validators/events/eventValidator";
import { ZodError } from "zod";

export class EventsController {
  async createEvent(req: Request, res: Response): Promise<void> {
    try {
      createEventValidator.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Validation failed.", 
          errors: error.issues.map((err) => ({ field: err.path.join('.'), message: err.message }))
        });
        return;
      }
      res.status(400).json({ message: "Invalid request data." });
      return;
    }

    const { name, event_date, start_time, end_time, dress_code, description, location } = req.body;
    const userId = (req as any).user.id;

    try {
      // Get the couple profile for the current user
      const profile = await coupleProfileRepository.findByUserId(userId);
      if (!profile) {
        res.status(404).json({ message: "Couple profile not found. Please create a profile first." });
        return;
      }

      const event = await eventsRepository.createEvent({
        couple_id: profile.id,
        name,
        event_date,
        start_time,
        end_time,
        dress_code,
        description,
        location,
      });
  
      logger.info(`Event created: ${event.id} for couple: ${profile.id}`);
      res.status(201).json({ message: "Event created successfully.", event });
    } catch (error) {
      logger.error(`Error creating event: ${error}`);
      res.status(500).json({ message: "Failed to create event." });
    }
  }

  async getEvents(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;

    try {
      const profile = await coupleProfileRepository.findByUserId(userId);
      if (!profile) {
        res.status(404).json({ message: "Couple profile not found." });
        return;
      }

      const events = await eventsRepository.findByCoupleId(profile.id);
      res.status(200).json({ events });
    } catch (error) {
      logger.error(`Error fetching events: ${error}`);
      res.status(500).json({ message: "Failed to fetch events." });
    }
  }

  async getEventById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
  
    try {
      const event = await eventsRepository.findById(id as string);
      if (!event) {
        res.status(404).json({ message: "Event not found." });
        return;
      }

      res.status(200).json({ event });
    } catch (error) {
      logger.error(`Error fetching event ${id}: ${error}`);
      res.status(500).json({ message: "Failed to fetch event." });
    }
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      updateEventValidator.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Validation failed.", 
          errors: error.issues.map((err) => ({ field: err.path.join('.'), message: err.message }))
        });
        return;
      }
      res.status(400).json({ message: "Invalid request data." });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    try {
      const updatedEvent = await eventsRepository.updateEvent(id as string, updateData);
      if (!updatedEvent) {
        res.status(404).json({ message: "Event not found or no changes made." });
        return;
      }

      logger.info(`Event updated: ${id}`);
      res.status(200).json({ message: "Event updated successfully.", event: updatedEvent });
    } catch (error) {
      logger.error(`Error updating event ${id}: ${error}`);
      res.status(500).json({ message: "Failed to update event." });
    }
  }

  async deleteEvent(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const deleted = await eventsRepository.deleteEvent(id as string);
      if (!deleted) {
        res.status(404).json({ message: "Event not found." });
        return;
      }

      logger.info(`Event deleted: ${id}`);
      res.status(200).json({ message: "Event deleted successfully." });
    } catch (error) {
      logger.error(`Error deleting event ${id}: ${error}`);
      res.status(500).json({ message: "Failed to delete event." });
    }
  }
}

export default new EventsController();
