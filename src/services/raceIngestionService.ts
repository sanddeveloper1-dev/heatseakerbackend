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
 * Race data ingestion service for processing daily race information
 */

import { TrackModel, Track } from "../models/Track";
import { RaceModel, Race } from "../models/Race";
import { RaceEntryModel, RaceEntry } from "../models/RaceEntry";
import { extractTrackCode, getStandardizedTrackName } from "../utils/trackMapper";
import {
	convertDateFormat,
	generateRaceId,
	validateRaceNumber,
	normalizeRaceEntry,
	validateRaceEntry
} from "../utils/dataNormalizer";
import logger from "../config/logger";
import {
	DailyRaceDataRequest,
	ProcessingResult,
	ProcessingStatistics,
	RaceProcessingResult,
	TransactionResult,
	DatabaseClient,
	RaceData
} from "../types/raceTypes";

export class RaceIngestionService {
	/**
	 * Process daily race data
	 */
	static async processDailyRaceData(data: DailyRaceDataRequest): Promise<ProcessingResult> {
		const statistics: ProcessingStatistics = {
			races_processed: 0,
			entries_processed: 0,
			races_skipped: 0,
			entries_skipped: 0,
			errors: []
		};

		let processedRaces: string[] = [];

		try {
			logger.info("Starting daily race data processing", {
				source: data.source,
				raceCount: data.races.length
			});

			// Process races with transaction support
			const results = await this.processRacesWithTransaction(data.races, data.source);

			// Aggregate results
			statistics.races_processed = results.successful.length;
			statistics.races_skipped = results.failed.length;
			statistics.entries_processed = results.totalEntries;
			statistics.errors = results.errors;
			processedRaces = results.successful.map(r => r.raceId).filter(Boolean);

			const success = statistics.races_processed > 0;
			const message = success
				? "Daily race data processed successfully"
				: "No races were processed successfully";

			logger.info("Daily race data processing completed", { statistics });

			return {
				success,
				message,
				statistics,
				processed_races: processedRaces
			};

		} catch (error: any) {
			logger.error("Fatal error in daily race data processing", { error });
			return {
				success: false,
				message: `Fatal error: ${error.message}`,
				statistics,
				processed_races: []
			};
		}
	}

	/**
	 * Process races with transaction support for data integrity
	 */
	private static async processRacesWithTransaction(races: RaceData[], source: string): Promise<TransactionResult> {
		const successful: Array<{ raceId: string; entriesProcessed: number }> = [];
		const failed: Array<{ raceId: string; error: string }> = [];
		const errors: string[] = [];
		let totalEntries = 0;

		// Import database pool for transaction management
		const { default: pool } = await import("../config/database");

		for (const raceData of races) {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");

				const result = await this.processRaceWithClient(client, raceData, source);

				if (result.success) {
					await client.query("COMMIT");
					successful.push({
						raceId: result.raceId!,
						entriesProcessed: result.entriesProcessed || 0
					});
					totalEntries += result.entriesProcessed || 0;
				} else {
					await client.query("ROLLBACK");
					failed.push({
						raceId: raceData.race_id || "unknown",
						error: result.error || "Unknown error"
					});
					errors.push(`Race ${raceData.race_id}: ${result.error}`);
				}
			} catch (error: any) {
				await client.query("ROLLBACK");
				const errorMsg = `Race ${raceData.race_id}: ${error.message}`;
				failed.push({
					raceId: raceData.race_id || "unknown",
					error: errorMsg
				});
				errors.push(errorMsg);
				logger.error("Error processing race", { raceData, error });
			} finally {
				client.release();
			}
		}

		return { successful, failed, totalEntries, errors };
	}

	/**
	 * Process a single race with database client
	 */
	private static async processRaceWithClient(client: DatabaseClient, raceData: RaceData, source: string): Promise<RaceProcessingResult> {
		try {
			// Validate race number
			const raceNumber = validateRaceNumber(raceData.race_number);
			if (raceNumber === null) {
				return {
					success: false,
					error: `Race number must be between 3 and 15, got: ${raceData.race_number}`
				};
			}

			// Process track
			const trackCode = extractTrackCode(raceData.track);
			const trackName = getStandardizedTrackName(raceData.track);

			const track = await TrackModel.getOrCreateWithClient(client, {
				code: trackCode,
				name: trackName
			});

			// Generate race ID
			const raceId = generateRaceId(trackCode, raceData.date, raceData.race_number.toString());

			// Convert date
			const normalizedDate = convertDateFormat(raceData.date);

			// Create race object
			const race: Race = {
				id: raceId,
				track_id: track.id!,
				date: new Date(normalizedDate),
				race_number: raceNumber,
				post_time: raceData.post_time || undefined,
				source_file: source
			};

			// Upsert race
			await RaceModel.upsertWithClient(client, race);

			// Process entries
			const validEntries = raceData.entries.filter(validateRaceEntry);

			if (validEntries.length < 1) {
				return {
					success: false,
					error: `Race must have at least 1 valid entry, got: ${validEntries.length}`
				};
			}

			// Normalize and create entry objects
			const normalizedEntries: RaceEntry[] = validEntries.map((entry: any) =>
				normalizeRaceEntry(entry, raceId, source)
			);

			// Batch upsert entries
			await RaceEntryModel.batchUpsertWithClient(client, normalizedEntries);

			logger.info("Race processed successfully", {
				raceId,
				trackName,
				raceNumber,
				entriesProcessed: normalizedEntries.length
			});

			return {
				success: true,
				raceId,
				entriesProcessed: normalizedEntries.length
			};

		} catch (error: any) {
			logger.error("Error processing race", { raceData, error });
			return {
				success: false,
				error: error.message
			};
		}
	}
} 