/**
 * HeatSeaker Backend - Commercial Software
 * Copyright (c) 2024 [CLIENT_ORG_NAME]
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

export interface ProcessingStatistics {
	races_processed: number;
	entries_processed: number;
	races_skipped: number;
	entries_skipped: number;
	errors: string[];
}

export interface ProcessingResult {
	success: boolean;
	message: string;
	statistics: ProcessingStatistics;
	processed_races: string[];
}

export class RaceIngestionService {
	/**
	 * Process daily race data
	 */
	static async processDailyRaceData(data: any): Promise<ProcessingResult> {
		const statistics: ProcessingStatistics = {
			races_processed: 0,
			entries_processed: 0,
			races_skipped: 0,
			entries_skipped: 0,
			errors: []
		};

		const processedRaces: string[] = [];

		try {
			logger.info("Starting daily race data processing", {
				source: data.source,
				raceCount: data.races.length
			});

			for (const raceData of data.races) {
				try {
					const result = await this.processRace(raceData, data.source);

					if (result.success) {
						statistics.races_processed++;
						statistics.entries_processed += result.entriesProcessed || 0;
						if (result.raceId) {
							processedRaces.push(result.raceId);
						}
					} else {
						statistics.races_skipped++;
						if (result.error) {
							statistics.errors.push(result.error);
						}
					}
				} catch (error: any) {
					statistics.races_skipped++;
					const errorMsg = `Race ${raceData.race_id}: ${error.message}`;
					statistics.errors.push(errorMsg);
					logger.error("Error processing race", { raceData, error });
				}
			}

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
	 * Process a single race
	 */
	private static async processRace(raceData: any, source: string): Promise<{
		success: boolean;
		raceId?: string;
		entriesProcessed?: number;
		error?: string;
	}> {
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

			const track = await TrackModel.getOrCreate({
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
				prev_race_1_winner_horse_number: raceData.prev_race_1_winner_horse_number
					? parseInt(raceData.prev_race_1_winner_horse_number)
					: undefined,
				prev_race_1_winner_payout: raceData.prev_race_1_winner_payout
					? parseFloat(raceData.prev_race_1_winner_payout)
					: undefined,
				prev_race_2_winner_horse_number: raceData.prev_race_2_winner_horse_number
					? parseInt(raceData.prev_race_2_winner_horse_number)
					: undefined,
				prev_race_2_winner_payout: raceData.prev_race_2_winner_payout
					? parseFloat(raceData.prev_race_2_winner_payout)
					: undefined,
				source_file: source
			};

			// Upsert race
			await RaceModel.upsert(race);

			// Process entries
			const validEntries = raceData.entries.filter(validateRaceEntry);

			if (validEntries.length < 3) {
				return {
					success: false,
					error: `Race must have at least 3 valid entries, got: ${validEntries.length}`
				};
			}

			// Normalize and create entry objects
			const normalizedEntries: RaceEntry[] = validEntries.map((entry: any) =>
				normalizeRaceEntry(entry, raceId, source)
			);

			// Batch upsert entries
			await RaceEntryModel.batchUpsert(normalizedEntries);

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