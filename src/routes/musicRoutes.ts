import { Router } from "express";
import musicController from "../controllers/musicController";

const router = Router();

// Publicly accessible library or protected
router.get("/", (req, res) => musicController.getLibrary(req, res));

export default router;
