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
import apiKeyAuth from "../middleware/apiKeyAuth";
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
router.post("/daily", apiKeyAuth, handleDailyRaceIngestion);

// GET /api/races/tracks - Get all tracks
router.get("/tracks", apiKeyAuth, getTracks);

// GET /api/races - Get races by date range
router.get("/", apiKeyAuth, getRacesByDateRange);

// GET /api/races/entries/daily - Get all race entries for a specific date
router.get("/entries/daily", apiKeyAuth, getDailyRaceEntries);

// GET /api/races/:id - Get specific race with entries
router.get("/:id", apiKeyAuth, getRaceById);

// Winner endpoints
// GET /api/races/:id/winner - Get winner for specific race
router.get("/:id/winner", apiKeyAuth, getWinnerByRaceId);

// GET /api/races/winners - Get winners by date range
router.get("/winners", apiKeyAuth, getWinnersByDateRange);

// GET /api/races/winners/daily - Get winners for a specific date
router.get("/winners/daily", apiKeyAuth, getDailyRaceWinners);

// GET /api/races/winners/track/:trackId - Get winners by track
router.get("/winners/track/:trackId", apiKeyAuth, getWinnersByTrack);

export default router; 