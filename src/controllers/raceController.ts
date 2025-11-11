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
 * Race controller for handling race data ingestion and management
 */

import { Request, Response } from "express";
import { RaceIngestionService } from "../services/raceIngestionService";
import { RaceWinnerService } from "../services/raceWinnerService";
import { validateDailyRaceData } from "../validators/raceValidator";
import logger from "../config/logger";
import { fetchDailyRaceEntries, fetchDailyRaceWinners } from "../services/raceDataFetchService";

/**
 * Handle daily race data ingestion
 */
export const handleDailyRaceIngestion = async (req: Request, res: Response): Promise<void> => {
	try {
		logger.info("Received daily race data ingestion request", {
			bodySize: JSON.stringify(req.body).length
		});

		// Validate request body
		const validation = validateDailyRaceData(req.body);
		if (validation.error) {
			logger.warn("Validation failed for daily race data", { error: validation.error });
			res.status(400).json({
				success: false,
				message: "Validation failed",
				errors: [validation.error],
				statistics: {
					races_processed: 0,
					entries_processed: 0,
					races_skipped: 0,
					entries_skipped: 0,
					errors: [validation.error]
				}
			});
			return;
		}

		// Process the race data
		const result = await RaceIngestionService.processDailyRaceData(validation.value);

		// Return appropriate response
		if (result.success) {
			logger.info("Daily race data processed successfully", {
				statistics: result.statistics
			});
			res.status(200).json({
				success: true,
				message: result.message,
				statistics: result.statistics,
				processed_races: result.processed_races
			});
		} else {
			logger.warn("Daily race data processing failed", {
				statistics: result.statistics
			});
			res.status(400).json({
				success: false,
				message: result.message,
				errors: result.statistics.errors,
				statistics: result.statistics
			});
		}

	} catch (error: any) {
		logger.error("Unexpected error in daily race data ingestion", { error: error.message });
		res.status(500).json({
			success: false,
			message: "An unexpected error occurred while processing the request",
			errors: [error.message],
			statistics: {
				races_processed: 0,
				entries_processed: 0,
				races_skipped: 0,
				entries_skipped: 0,
				errors: [error.message]
			}
		});
	}
};

/**
 * Get all tracks
 */
export const getTracks = async (req: Request, res: Response): Promise<void> => {
	try {
		const { TrackModel } = await import("../models/Track");
		const tracks = await TrackModel.findAll();

		logger.info("Retrieved tracks", { count: tracks.length });
		res.status(200).json({
			success: true,
			tracks
		});
	} catch (error: any) {
		logger.error("Error retrieving tracks", { error: error.message });
		res.status(500).json({
			success: false,
			message: "Error retrieving tracks",
			error: error.message
		});
	}
};

/**
 * Get races by date range
 */
export const getRacesByDateRange = async (req: Request, res: Response): Promise<void> => {
	try {
		const { startDate, endDate } = req.query;

		if (!startDate || !endDate) {
			res.status(400).json({
				success: false,
				message: "startDate and endDate query parameters are required"
			});
			return;
		}

		const { RaceModel } = await import("../models/Race");
		const races = await RaceModel.findByDateRange(
			new Date(startDate as string),
			new Date(endDate as string)
		);

		logger.info("Retrieved races by date range", {
			startDate,
			endDate,
			count: races.length
		});

		res.status(200).json({
			success: true,
			races
		});
	} catch (error: any) {
		logger.error("Error retrieving races by date range", { error: error.message });
		res.status(500).json({
			success: false,
			message: "Error retrieving races",
			error: error.message
		});
	}
};

/**
 * Get race by ID with entries
 */
export const getRaceById = async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;

		const { RaceModel } = await import("../models/Race");
		const { RaceEntryModel } = await import("../models/RaceEntry");

		const race = await RaceModel.findById(id);
		if (!race) {
			res.status(404).json({
				success: false,
				message: "Race not found"
			});
			return;
		}

		const entries = await RaceEntryModel.findByRaceId(id);

		logger.info("Retrieved race by ID", { raceId: id, entryCount: entries.length });

		res.status(200).json({
			success: true,
			race,
			entries
		});
	} catch (error: any) {
		logger.error("Error retrieving race by ID", { error: error.message });
		res.status(500).json({
			success: false,
			message: "Error retrieving race",
			error: error.message
		});
	}
};

/**
 * Get winner for a specific race
 */
export const getWinnerByRaceId = async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;

		if (!id) {
			res.status(400).json({
				success: false,
				message: "Race ID is required"
			});
			return;
		}

		const winner = await RaceWinnerService.getWinnerByRaceId(id);

		if (!winner) {
			res.status(404).json({
				success: false,
				message: "Winner not found for this race"
			});
			return;
		}

		res.json({
			success: true,
			winner
		});
	} catch (error: any) {
		logger.error("Error retrieving winner by race ID", { error: error.message, raceId: req.params.id });
		res.status(500).json({
			success: false,
			message: "Error retrieving winner",
			error: error.message
		});
	}
};

/**
 * Get winners by date range
 */
export const getWinnersByDateRange = async (req: Request, res: Response): Promise<void> => {
	try {
		const { startDate, endDate } = req.query;

		if (!startDate || !endDate) {
			res.status(400).json({
				success: false,
				message: "Both startDate and endDate are required"
			});
			return;
		}

		const winners = await RaceWinnerService.getWinnersByDateRange(startDate as string, endDate as string);

		res.json({
			success: true,
			winners,
			count: winners.length
		});
	} catch (error: any) {
		logger.error("Error retrieving winners by date range", { error: error.message, startDate: req.query.startDate, endDate: req.query.endDate });
		res.status(500).json({
			success: false,
			message: "Error retrieving winners",
			error: error.message
		});
	}
};

/**
 * Get winners by track
 */
export const getWinnersByTrack = async (req: Request, res: Response): Promise<void> => {
	try {
		const { trackId } = req.params;

		if (!trackId) {
			res.status(400).json({
				success: false,
				message: "Track ID is required"
			});
			return;
		}

		const trackIdNum = parseInt(trackId);
		if (isNaN(trackIdNum)) {
			res.status(400).json({
				success: false,
				message: "Track ID must be a valid number"
			});
			return;
		}

		const winners = await RaceWinnerService.getWinnersByTrack(trackIdNum);

		res.json({
			success: true,
			winners,
			count: winners.length
		});
	} catch (error: any) {
		logger.error("Error retrieving winners by track", { error: error.message, trackId: req.params.trackId });
		res.status(500).json({
			success: false,
			message: "Error retrieving winners",
			error: error.message
		});
	}
};

/**
 * Fetch daily race entries across all tracks using the Neon Data API.
 */
export const getDailyRaceEntries = async (req: Request, res: Response): Promise<void> => {
	try {
		const { date } = req.query;

		if (!date || typeof date !== "string") {
			res.status(400).json({
				success: false,
				message: "A valid 'date' query parameter (YYYY-MM-DD) is required"
			});
			return;
		}

		const entries = await fetchDailyRaceEntries(date);

		res.status(200).json({
			success: true,
			date,
			count: entries.length,
			entries
		});
	} catch (error: any) {
		logger.error("Error fetching daily race entries", { error: error.message, date: req.query.date });
		res.status(500).json({
			success: false,
			message: "Error fetching daily race entries",
			error: error.message
		});
	}
};

/**
 * Fetch daily race winners across all tracks using the Neon Data API.
 */
export const getDailyRaceWinners = async (req: Request, res: Response): Promise<void> => {
	try {
		const { date } = req.query;

		if (!date || typeof date !== "string") {
			res.status(400).json({
				success: false,
				message: "A valid 'date' query parameter (YYYY-MM-DD) is required"
			});
			return;
		}

		const winners = await fetchDailyRaceWinners(date);

		res.status(200).json({
			success: true,
			date,
			count: winners.length,
			winners
		});
	} catch (error: any) {
		logger.error("Error fetching daily race winners", { error: error.message, date: req.query.date });
		res.status(500).json({
			success: false,
			message: "Error fetching daily race winners",
			error: error.message
		});
	}
};
