/**
 * HeatSeaker Backend - Commercial Software
 * Copyright (c) 2024 Paul Stortini
 * Software Development & Maintenance by Alexander Meyer
 * 
 * ZERO LIABILITY NOTICE: Service provider assumes no liability for betting operations.
 * Client bears 100% responsibility for all business outcomes.
 * 
 * This software is provided "AS IS" without warranty.
 * For complete terms, see SERVICE_AGREEMENT.md
 * 
 * Race routes for race data ingestion and management
 */

import { Router } from "express";
import flexibleAuth from "../middleware/flexibleAuth"; // Import flexible auth middleware (JWT OR API key)
import {
	handleDailyRaceIngestion,
	getTracks,
	getRacesByDateRange,
	getRaceById,
	getWinnerByRaceId,
	getWinnersByDateRange,
	getWinnersByTrack,
	getDailyRaceEntries,
	getDailyRaceWinners
} from "../controllers/raceController";

const router = Router();

// POST /api/races/daily - Main race data ingestion endpoint
router.post("/daily", flexibleAuth, handleDailyRaceIngestion);

// GET /api/races/tracks - Get all tracks
router.get("/tracks", flexibleAuth, getTracks);

// GET /api/races - Get races by date range
router.get("/", flexibleAuth, getRacesByDateRange);

// GET /api/races/entries/daily - Get all race entries for a specific date
router.get("/entries/daily", flexibleAuth, getDailyRaceEntries);

// Winner endpoints
// GET /api/races/:id/winner - Get winner for specific race
router.get("/:id/winner", flexibleAuth, getWinnerByRaceId);

// GET /api/races/winners - Get winners by date range
router.get("/winners", flexibleAuth, getWinnersByDateRange);

// GET /api/races/winners/daily - Get winners for a specific date
router.get("/winners/daily", flexibleAuth, getDailyRaceWinners);

// GET /api/races/winners/track/:trackId - Get winners by track
router.get("/winners/track/:trackId", flexibleAuth, getWinnersByTrack);

// GET /api/races/:id - Get specific race with entries
router.get("/:id", flexibleAuth, getRaceById);

export default router; 