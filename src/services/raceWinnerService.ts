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
 * Race winner extraction and processing service
 */

import { RaceWinnerModel, RaceWinner } from "../models/RaceWinner";
import { RaceEntryModel, RaceEntry } from "../models/RaceEntry";
import { RaceWinnerData } from "../types/raceTypes";
import { raceWinnerSchema } from "../validators/raceValidator";
import logger from "../config/logger";
import { DatabaseClient } from "../types/raceTypes";

export interface WinnerExtractionResult {
	success: boolean;
	winner?: RaceWinnerData;
	error?: string;
	extractionMethod?: 'simple_correct' | 'header' | 'summary' | 'cross_reference';
	confidence?: 'high' | 'medium' | 'low';
}

export interface WinnerProcessingResult {
	success: boolean;
	raceId?: string;
	winner?: RaceWinner;
	error?: string;
}

export class RaceWinnerService {
	/**
	 * Extract winner data from various sources
	 */
	static extractWinner(
		raceId: string,
		raceEntries: RaceEntry[],
		raceWinnersData?: any,
		raceNumber?: string
	): WinnerExtractionResult {
		try {
			// Strategy 1: Extract from race_winners section (highest confidence)
			if (raceWinnersData && raceWinnersData[`race_${raceNumber}`]) {
				const winnerData = raceWinnersData[`race_${raceNumber}`];
				if (this.isValidWinnerData(winnerData, raceEntries)) {
					return {
						success: true,
						winner: {
							race_id: raceId,
							winning_horse_number: winnerData.winning_horse_number,
							winning_payout_2_dollar: winnerData.winning_payout_2_dollar,
							winning_payout_1_p3: winnerData.winning_payout_1_p3,
							extraction_method: 'header',
							extraction_confidence: 'high'
						},
						extractionMethod: 'header',
						confidence: 'high'
					};
				}
			}

			// Strategy 2: Find horse with position == 1 in race entries (medium confidence)
			const positionWinner = this.findWinnerByPosition(raceEntries);
			if (positionWinner) {
				return {
					success: true,
					winner: {
						race_id: raceId,
						winning_horse_number: positionWinner.horse_number,
						winning_payout_2_dollar: positionWinner.will_pay_2 ? this.parsePayout(positionWinner.will_pay_2) : undefined,
						winning_payout_1_p3: positionWinner.will_pay_1_p3 ? this.parsePayout(positionWinner.will_pay_1_p3) : undefined,
						extraction_method: 'summary',
						extraction_confidence: 'medium'
					},
					extractionMethod: 'summary',
					confidence: 'medium'
				};
			}

			// Strategy 3: Cross-reference with highest payout amounts (low confidence)
			const payoutWinner = this.findWinnerByPayouts(raceEntries);
			if (payoutWinner) {
				return {
					success: true,
					winner: {
						race_id: raceId,
						winning_horse_number: payoutWinner.horse_number,
						winning_payout_2_dollar: payoutWinner.will_pay_2 ? this.parsePayout(payoutWinner.will_pay_2) : undefined,
						winning_payout_1_p3: payoutWinner.will_pay_1_p3 ? this.parsePayout(payoutWinner.will_pay_1_p3) : undefined,
						extraction_method: 'cross_reference',
						extraction_confidence: 'low'
					},
					extractionMethod: 'cross_reference',
					confidence: 'low'
				};
			}

			return {
				success: false,
				error: `No winner could be determined for race ${raceId}`
			};

		} catch (error: any) {
			logger.error("Error extracting winner", { error: error.message, raceId });
			return {
				success: false,
				error: `Error extracting winner: ${error.message}`
			};
		}
	}

	/**
	 * Validate winner data
	 */
	static validateWinner(winner: RaceWinnerData): { error?: string; value?: RaceWinnerData } {
		const { error, value } = raceWinnerSchema.validate(winner);
		if (error) {
			return { error: error.details[0].message };
		}
		return { value };
	}

	/**
	 * Process and store a race winner
	 */
	static async processWinner(
		winner: RaceWinnerData,
		client?: DatabaseClient
	): Promise<WinnerProcessingResult> {
		try {
			// Validate winner data
			const validation = this.validateWinner(winner);
			if (validation.error) {
				return {
					success: false,
					error: `Validation error: ${validation.error}`
				};
			}

			// Store winner in database
			const storedWinner = client
				? await RaceWinnerModel.upsertWithClient(client, winner)
				: await RaceWinnerModel.upsert(winner);

			logger.info("Race winner processed successfully", {
				raceId: winner.race_id,
				horseNumber: winner.winning_horse_number,
				method: winner.extraction_method,
				confidence: winner.extraction_confidence
			});

			return {
				success: true,
				raceId: winner.race_id,
				winner: storedWinner
			};

		} catch (error: any) {
			logger.error("Error processing race winner", { error: error.message, winner });
			return {
				success: false,
				error: `Error processing winner: ${error.message}`
			};
		}
	}

	/**
	 * Process winners for multiple races
	 */
	static async processWinners(
		winners: RaceWinnerData[],
		client?: DatabaseClient
	): Promise<{
		successful: Array<{ raceId: string; winner: RaceWinner }>;
		failed: Array<{ raceId: string; error: string }>;
		totalWinners: number;
		errors: string[];
	}> {
		const successful: Array<{ raceId: string; winner: RaceWinner }> = [];
		const failed: Array<{ raceId: string; error: string }> = [];
		const errors: string[] = [];

		for (const winner of winners) {
			const result = await this.processWinner(winner, client);
			if (result.success && result.winner) {
				successful.push({
					raceId: winner.race_id,
					winner: result.winner
				});
			} else {
				failed.push({
					raceId: winner.race_id,
					error: result.error || 'Unknown error'
				});
				errors.push(`Race ${winner.race_id}: ${result.error || 'Unknown error'}`);
			}
		}

		return {
			successful,
			failed,
			totalWinners: winners.length,
			errors
		};
	}

	/**
	 * Check if winner data is valid
	 */
	private static isValidWinnerData(winnerData: any, raceEntries: RaceEntry[]): boolean {
		if (!winnerData || typeof winnerData.winning_horse_number !== 'number') {
			return false;
		}

		// Check if winning horse number exists in race entries
		const horseExists = raceEntries.some(entry => entry.horse_number === winnerData.winning_horse_number);
		if (!horseExists) {
			return false;
		}

		// Validate payout amounts if present
		if (winnerData.winning_payout_2_dollar !== undefined && winnerData.winning_payout_2_dollar < 0) {
			return false;
		}
		if (winnerData.winning_payout_1_p3 !== undefined && winnerData.winning_payout_1_p3 < 0) {
			return false;
		}

		return true;
	}

	/**
	 * Find winner by position data in race entries
	 */
	private static findWinnerByPosition(raceEntries: RaceEntry[]): RaceEntry | null {
		// Look for position field or other indicators of winning horse
		// This is a placeholder - actual implementation would depend on your data structure
		// For now, we'll look for the horse with the highest will_pay_2 amount as a proxy
		// Note: This is currently using payout logic, but in a real implementation
		// you would look for actual position data (e.g., position == 1)
		return this.findWinnerByPayouts(raceEntries);
	}

	/**
	 * Find winner by cross-referencing payout amounts
	 */
	private static findWinnerByPayouts(raceEntries: RaceEntry[]): RaceEntry | null {
		if (raceEntries.length === 0) {
			return null;
		}

		// Find horse with highest will_pay_2 amount (excluding invalid values)
		let winner: RaceEntry | null = null;
		let highestPayout = 0;

		for (const entry of raceEntries) {
			if (entry.will_pay_2) {
				const payout = this.parsePayout(entry.will_pay_2);
				if (payout > highestPayout) {
					highestPayout = payout;
					winner = entry;
				}
			}
		}

		return winner;
	}

	/**
	 * Parse payout string to number
	 */
	private static parsePayout(payoutStr: string): number {
		if (!payoutStr || typeof payoutStr !== 'string') {
			return 0;
		}

		// Remove currency symbols and parse
		const cleaned = payoutStr.replace(/[$,]/g, '');
		const parsed = parseFloat(cleaned);
		return isNaN(parsed) ? 0 : parsed;
	}

	/**
	 * Get winner for a specific race
	 */
	static async getWinnerByRaceId(raceId: string): Promise<RaceWinner | null> {
		try {
			return await RaceWinnerModel.findByRaceId(raceId);
		} catch (error: any) {
			logger.error("Error getting winner by race ID", { error: error.message, raceId });
			throw error;
		}
	}

	/**
	 * Get winners for a date range
	 */
	static async getWinnersByDateRange(startDate: string, endDate: string): Promise<RaceWinner[]> {
		try {
			return await RaceWinnerModel.findByDateRange(startDate, endDate);
		} catch (error: any) {
			logger.error("Error getting winners by date range", { error: error.message, startDate, endDate });
			throw error;
		}
	}

	/**
	 * Get winners by track
	 */
	static async getWinnersByTrack(trackId: number): Promise<RaceWinner[]> {
		try {
			return await RaceWinnerModel.findByTrack(trackId);
		} catch (error: any) {
			logger.error("Error getting winners by track", { error: error.message, trackId });
			throw error;
		}
	}

	/**
	 * Delete winner by race ID
	 */
	static async deleteWinnerByRaceId(raceId: string, client?: DatabaseClient): Promise<boolean> {
		try {
			return client
				? await RaceWinnerModel.deleteByRaceIdWithClient(client, raceId)
				: await RaceWinnerModel.deleteByRaceId(raceId);
		} catch (error: any) {
			logger.error("Error deleting winner by race ID", { error: error.message, raceId });
			throw error;
		}
	}
}
