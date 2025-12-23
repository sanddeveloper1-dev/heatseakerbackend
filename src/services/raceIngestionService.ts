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
import { RaceWinnerModel } from "../models/RaceWinner";
import { RaceWinnerService } from "./raceWinnerService";
import { extractTrackCode, getStandardizedTrackName, TRACK_MAPPING } from "../utils/trackMapper";
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
	RaceData,
	RaceWinnerData
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
				raceCount: data.races.length,
				raceWinnersCount: data.race_winners ? Object.keys(data.race_winners).length : 0,
				raceWinnersKeys: data.race_winners ? Object.keys(data.race_winners) : [],
				fullRaceWinnersData: data.race_winners
			});

			// Process races with transaction support
			const results = await this.processRacesWithTransaction(data.races, data.source, data.race_winners);

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
	private static async processRacesWithTransaction(races: RaceData[], source: string, raceWinnersData: { [raceId: string]: RaceWinnerData }): Promise<TransactionResult> {
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

				const result = await this.processRaceWithClient(client, raceData, source, raceWinnersData);

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
	private static async processRaceWithClient(client: DatabaseClient, raceData: RaceData, source: string, raceWinnersData: { [raceId: string]: RaceWinnerData }): Promise<RaceProcessingResult> {
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
			const normalizedEntries: RaceEntry[] = validEntries.map((entry: any) => {
				const normalized = normalizeRaceEntry(entry, raceId, source);
				// Log ALL entries to see what's happening with purse, race_type, and age
				logger.info("Normalizing entry fields", {
					raceId,
					horseNumber: entry.horse_number,
					original: {
						purse: entry.purse,
						race_type: entry.race_type,
						age: entry.age
					},
					normalized: {
						purse: normalized.purse,
						race_type: normalized.race_type,
						age: normalized.age
					},
					normalizedEntryKeys: Object.keys(normalized),
					hasPurse: 'purse' in normalized,
					hasRaceType: 'race_type' in normalized,
					hasAge: 'age' in normalized
				});
				return normalized;
			});

			// Log before database insertion
			logger.info("About to insert entries into database", {
				raceId,
				entryCount: normalizedEntries.length,
				sampleEntry: normalizedEntries[0] ? {
					horse_number: normalizedEntries[0].horse_number,
					purse: normalizedEntries[0].purse,
					race_type: normalizedEntries[0].race_type,
					age: normalizedEntries[0].age,
					allKeys: Object.keys(normalizedEntries[0])
				} : null
			});

			// Batch upsert entries
			await RaceEntryModel.batchUpsertWithClient(client, normalizedEntries);

			// Process race winner (required)
			let winnerProcessed = false;
			try {
				// Process race winner for this specific race
				const winnerResult = await this.processRaceWinnerForRace(client, raceId, raceWinnersData);
				if (winnerResult.success) {
					winnerProcessed = true;
					logger.info("Race winner processed successfully", {
						raceId,
						horseNumber: winnerResult.winner?.winning_horse_number,
						method: winnerResult.winner?.extraction_method,
						confidence: winnerResult.winner?.extraction_confidence
					});
				} else {
					logger.warn("Failed to process race winner", {
						raceId,
						error: winnerResult.error
					});
				}
			} catch (error: any) {
				logger.error("Error processing race winner", {
					raceId,
					error: error.message
				});
			}

			logger.info("Race processed successfully", {
				raceId,
				trackName,
				raceNumber,
				entriesProcessed: normalizedEntries.length,
				winnerProcessed
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

	/**
	 * Process race winner for a specific race
	 */
	private static async processRaceWinnerForRace(
		client: DatabaseClient,
		raceId: string,
		raceWinnersData: { [raceId: string]: RaceWinnerData }
	): Promise<{ success: boolean; winner?: any; error?: string }> {
		try {
			// Log full raceWinnersData object for debugging
			const raceIdParts = raceId.split('_');
			const trackCode = raceIdParts[0];
			const raceNumber = raceIdParts[2];
			const allWinnerKeys = Object.keys(raceWinnersData || {});

			// Get full track name for matching (frontend uses full names like "PARX", not codes like "PRX")
			const trackName = TRACK_MAPPING[trackCode] || trackCode;

			logger.info("Processing race winner - full data object", {
				raceId,
				trackCode,
				trackName,
				raceNumber,
				raceWinnersDataKeys: allWinnerKeys,
				raceWinnersDataCount: allWinnerKeys.length,
				fullRaceWinnersData: raceWinnersData,
				matchingLogic: {
					lookingForTrackCode: trackCode,
					lookingForTrackName: trackName,
					lookingForRaceNumber: raceNumber,
					availableKeys: allWinnerKeys.map(key => ({
						key,
						includesTrackCode: key.includes(trackCode),
						includesTrackName: key.includes(trackName),
						includesRaceNumber: key.includes(raceNumber),
						wouldMatch: key.includes(trackName) && key.includes(raceNumber)
					}))
				}
			});

			// Look for winner data for this specific race
			// The raceWinnersData should contain entries like "PARX 12-22-25 Race 03"
			// Use full track name (e.g., "PARX") instead of code (e.g., "PRX") for matching
			const winnerKey = allWinnerKeys.find(key =>
				key.includes(trackName) &&      // Match full track name (e.g., "PARX")
				key.includes(raceNumber)         // Match race number (e.g., "03")
			);

			if (!winnerKey) {
				logger.warn("No winner data found for race", {
					raceId,
					trackCode,
					trackName,
					raceNumber,
					availableKeys: allWinnerKeys,
					raceWinnersData: raceWinnersData
				});
				return {
					success: false,
					error: `No winner data found for race ${raceId}`
				};
			}

			const winnerData = raceWinnersData[winnerKey];

			// Convert race_id to database format
			const convertedRaceId = this.convertRaceIdToDbFormat(winnerData.race_id);

			// Validate winner data
			const validation = this.validateWinnerData(winnerData);
			if (!validation.isValid) {
				return {
					success: false,
					error: validation.error
				};
			}

			// Create winner object
			const winnerInfo = {
				race_id: convertedRaceId,
				winning_horse_number: winnerData.winning_horse_number,
				winning_payout_2_dollar: winnerData.winning_payout_2_dollar,
				winning_payout_1_p3: winnerData.winning_payout_1_p3,
				extraction_method: winnerData.extraction_method || 'simple_correct',
				extraction_confidence: winnerData.extraction_confidence || 'high'
			};

			// Store winner in database
			const storedWinner = await RaceWinnerModel.upsertWithClient(client, winnerInfo);

			return {
				success: true,
				winner: storedWinner
			};

		} catch (error: any) {
			logger.error("Error processing race winner for race", { raceId, error: error.message });
			return {
				success: false,
				error: error.message
			};
		}
	}

	/**
	 * Convert race ID from "SARATOGA 9-1-25 Race 3" to "SAR_20250901_3"
	 */
	private static convertRaceIdToDbFormat(raceId: string): string {
		const pattern = /^(.+?)\s+(\d{1,2}-\d{1,2}-\d{2})\s+Race\s+(\d+)$/;
		const match = raceId.match(pattern);

		if (!match) {
			return raceId; // Return original if parsing fails
		}

		const trackName = match[1].trim();
		const dateStr = match[2];
		const raceNumber = match[3];

		// Convert track name to code
		const trackCode = this.getTrackCode(trackName);

		// Convert date MM-DD-YY to YYYYMMDD
		const standardDate = this.convertDateToDbFormat(dateStr);
		const dateFormatted = standardDate.replace(/-/g, '');

		// Zero-pad race number to match generateRaceId format (e.g., "3" -> "03")
		const raceNumberPadded = raceNumber.padStart(2, '0');

		// Build new race_id
		return `${trackCode}_${dateFormatted}_${raceNumberPadded}`;
	}

	/**
	 * Get track code from track name
	 */
	private static getTrackCode(trackName: string): string {
		const trackMapping: { [key: string]: string } = {
			'SARATOGA': 'SAR',
			'AQUEDUCT': 'AQU',
			'BELMONT': 'BEL',
			'CHURCHILL': 'CD',
			'GULFSTREAM': 'GP',
			'MONMOUTH': 'MTH',
			'WOODBINE': 'WO',
			'DELAWARE PARK': 'DEL',
			'PARX': 'PRX',
			'ELLIS PARK': 'ELP',
			'COLONIAL DOWNS': 'CNL',
			'DELMAR': 'DMR',
			'KEENELAND': 'KEE',
			'SANTA ANITA': 'SA',
			'LOS ALAMITOS': 'LA',
			'LAUREL': 'LRL',
			'PIMLICO': 'PIM',
			'KENTUCKY DOWNS': 'KD',
			'CANTERBURY PARK': 'CBY',
			'GOLDEN GATE': 'GG',
			'PENN NATIONAL': 'PEN',
			'TAMPA BAY': 'TAM',
			'OAKLAWN': 'OP',
			'PLAYGROUND': 'PLAY'
		};

		return trackMapping[trackName.toUpperCase()] || trackName.toUpperCase().substring(0, 3);
	}

	/**
	 * Convert date from MM-DD-YY to YYYY-MM-DD format
	 */
	private static convertDateToDbFormat(dateStr: string): string {
		const [month, day, year] = dateStr.split('-');
		const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
		return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	}

	/**
	 * Validate winner data
	 */
	private static validateWinnerData(winner: any): { isValid: boolean; error?: string } {
		// Validate horse number
		if (!winner.winning_horse_number || winner.winning_horse_number < 1 || winner.winning_horse_number > 16) {
			return {
				isValid: false,
				error: `Invalid winner number ${winner.winning_horse_number}. Must be between 1 and 16.`
			};
		}

		// Validate payout amounts
		if (winner.winning_payout_2_dollar !== undefined && winner.winning_payout_2_dollar < 0) {
			return {
				isValid: false,
				error: `Invalid payout amount ${winner.winning_payout_2_dollar}. Must be positive.`
			};
		}

		if (winner.winning_payout_1_p3 !== undefined && winner.winning_payout_1_p3 < 0) {
			return {
				isValid: false,
				error: `Invalid P3 payout amount ${winner.winning_payout_1_p3}. Must be positive.`
			};
		}

		// Validate extraction method
		const validMethods = ['simple_correct', 'header', 'summary', 'cross_reference'];
		if (winner.extraction_method && !validMethods.includes(winner.extraction_method)) {
			return {
				isValid: false,
				error: `Invalid extraction method ${winner.extraction_method}. Must be one of: ${validMethods.join(', ')}.`
			};
		}

		// Validate confidence level
		const validConfidences = ['high', 'medium', 'low'];
		if (winner.extraction_confidence && !validConfidences.includes(winner.extraction_confidence)) {
			return {
				isValid: false,
				error: `Invalid confidence level ${winner.extraction_confidence}. Must be one of: ${validConfidences.join(', ')}.`
			};
		}

		return { isValid: true };
	}
} 