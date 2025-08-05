import { Router } from "express";
import apiKeyAuth from "../middleware/apiKeyAuth";
import {
	handleDailyRaceIngestion,
	getTracks,
	getRacesByDateRange,
	getRaceById
} from "../controllers/raceController";

const router = Router();

// POST /api/races/daily - Main race data ingestion endpoint
router.post("/daily", apiKeyAuth, handleDailyRaceIngestion);

// GET /api/races/tracks - Get all tracks
router.get("/tracks", apiKeyAuth, getTracks);

// GET /api/races - Get races by date range
router.get("/", apiKeyAuth, getRacesByDateRange);

// GET /api/races/:id - Get specific race with entries
router.get("/:id", apiKeyAuth, getRaceById);

export default router; 