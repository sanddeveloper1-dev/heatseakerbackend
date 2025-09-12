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
 * Race winner data model and database operations for winner management
 */

import pool from "../config/database";
import logger from "../config/logger";
import { DatabaseClient } from "../types/raceTypes";

export interface RaceWinner {
	id?: number;
	race_id: string;
	winning_horse_number: number;
	winning_payout_2_dollar?: number;
	winning_payout_1_p3?: number;
	extraction_method: 'simple_correct' | 'header' | 'summary' | 'cross_reference';
	extraction_confidence: 'high' | 'medium' | 'low';
	created_at?: Date;
	updated_at?: Date;
}

export class RaceWinnerModel {
	/**
	 * Find winner by race ID
	 */
	static async findByRaceId(raceId: string): Promise<RaceWinner | null> {
		try {
			const query = `
				SELECT * FROM race_winners 
				WHERE race_id = $1
			`;
			const result = await pool.query(query, [raceId]);
			return result.rows[0] || null;
		} catch (error: any) {
			logger.error("Error finding race winner by race ID", { error: error.message, raceId });
			throw error;
		}
	}

	/**
	 * Create a new race winner
	 */
	static async create(winner: Omit<RaceWinner, 'id' | 'created_at' | 'updated_at'>): Promise<RaceWinner> {
		try {
			const query = `
				INSERT INTO race_winners (
					race_id, winning_horse_number, winning_payout_2_dollar, 
					winning_payout_1_p3, extraction_method, extraction_confidence
				) VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING *
			`;
			const values = [
				winner.race_id,
				winner.winning_horse_number,
				winner.winning_payout_2_dollar,
				winner.winning_payout_1_p3,
				winner.extraction_method,
				winner.extraction_confidence
			];
			const result = await pool.query(query, values);
			logger.info("Race winner created successfully", { raceId: winner.race_id, horseNumber: winner.winning_horse_number });
			return result.rows[0];
		} catch (error: any) {
			logger.error("Error creating race winner", { error: error.message, winner });
			throw error;
		}
	}

	/**
	 * Create a new race winner with database client (for transactions)
	 */
	static async createWithClient(client: DatabaseClient, winner: Omit<RaceWinner, 'id' | 'created_at' | 'updated_at'>): Promise<RaceWinner> {
		try {
			const query = `
				INSERT INTO race_winners (
					race_id, winning_horse_number, winning_payout_2_dollar, 
					winning_payout_1_p3, extraction_method, extraction_confidence
				) VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING *
			`;
			const values = [
				winner.race_id,
				winner.winning_horse_number,
				winner.winning_payout_2_dollar,
				winner.winning_payout_1_p3,
				winner.extraction_method,
				winner.extraction_confidence
			];
			const result = await client.query(query, values);
			logger.info("Race winner created successfully with client", { raceId: winner.race_id, horseNumber: winner.winning_horse_number });
			return result.rows[0];
		} catch (error: any) {
			logger.error("Error creating race winner with client", { error: error.message, winner });
			throw error;
		}
	}

	/**
	 * Update an existing race winner
	 */
	static async update(id: number, winner: Partial<Omit<RaceWinner, 'id' | 'race_id' | 'created_at' | 'updated_at'>>): Promise<RaceWinner> {
		try {
			const fields = [];
			const values = [];
			let paramCount = 1;

			if (winner.winning_horse_number !== undefined) {
				fields.push(`winning_horse_number = $${paramCount++}`);
				values.push(winner.winning_horse_number);
			}
			if (winner.winning_payout_2_dollar !== undefined) {
				fields.push(`winning_payout_2_dollar = $${paramCount++}`);
				values.push(winner.winning_payout_2_dollar);
			}
			if (winner.winning_payout_1_p3 !== undefined) {
				fields.push(`winning_payout_1_p3 = $${paramCount++}`);
				values.push(winner.winning_payout_1_p3);
			}
			if (winner.extraction_method !== undefined) {
				fields.push(`extraction_method = $${paramCount++}`);
				values.push(winner.extraction_method);
			}
			if (winner.extraction_confidence !== undefined) {
				fields.push(`extraction_confidence = $${paramCount++}`);
				values.push(winner.extraction_confidence);
			}

			if (fields.length === 0) {
				throw new Error("No fields to update");
			}

			fields.push(`updated_at = CURRENT_TIMESTAMP`);
			values.push(id);

			const query = `
				UPDATE race_winners 
				SET ${fields.join(', ')}
				WHERE id = $${paramCount}
				RETURNING *
			`;
			const result = await pool.query(query, values);

			if (result.rows.length === 0) {
				throw new Error(`Race winner with id ${id} not found`);
			}

			logger.info("Race winner updated successfully", { id, winner });
			return result.rows[0];
		} catch (error: any) {
			logger.error("Error updating race winner", { error: error.message, id, winner });
			throw error;
		}
	}

	/**
	 * Update an existing race winner with database client (for transactions)
	 */
	static async updateWithClient(client: DatabaseClient, id: number, winner: Partial<Omit<RaceWinner, 'id' | 'race_id' | 'created_at' | 'updated_at'>>): Promise<RaceWinner> {
		try {
			const fields = [];
			const values = [];
			let paramCount = 1;

			if (winner.winning_horse_number !== undefined) {
				fields.push(`winning_horse_number = $${paramCount++}`);
				values.push(winner.winning_horse_number);
			}
			if (winner.winning_payout_2_dollar !== undefined) {
				fields.push(`winning_payout_2_dollar = $${paramCount++}`);
				values.push(winner.winning_payout_2_dollar);
			}
			if (winner.winning_payout_1_p3 !== undefined) {
				fields.push(`winning_payout_1_p3 = $${paramCount++}`);
				values.push(winner.winning_payout_1_p3);
			}
			if (winner.extraction_method !== undefined) {
				fields.push(`extraction_method = $${paramCount++}`);
				values.push(winner.extraction_method);
			}
			if (winner.extraction_confidence !== undefined) {
				fields.push(`extraction_confidence = $${paramCount++}`);
				values.push(winner.extraction_confidence);
			}

			if (fields.length === 0) {
				throw new Error("No fields to update");
			}

			fields.push(`updated_at = CURRENT_TIMESTAMP`);
			values.push(id);

			const query = `
				UPDATE race_winners 
				SET ${fields.join(', ')}
				WHERE id = $${paramCount}
				RETURNING *
			`;
			const result = await client.query(query, values);

			if (result.rows.length === 0) {
				throw new Error(`Race winner with id ${id} not found`);
			}

			logger.info("Race winner updated successfully with client", { id, winner });
			return result.rows[0];
		} catch (error: any) {
			logger.error("Error updating race winner with client", { error: error.message, id, winner });
			throw error;
		}
	}

	/**
	 * Upsert a race winner (insert or update)
	 */
	static async upsert(winner: Omit<RaceWinner, 'id' | 'created_at' | 'updated_at'>): Promise<RaceWinner> {
		try {
			const query = `
				INSERT INTO race_winners (
					race_id, winning_horse_number, winning_payout_2_dollar, 
					winning_payout_1_p3, extraction_method, extraction_confidence
				) VALUES ($1, $2, $3, $4, $5, $6)
				ON CONFLICT (race_id) 
				DO UPDATE SET
					winning_horse_number = EXCLUDED.winning_horse_number,
					winning_payout_2_dollar = EXCLUDED.winning_payout_2_dollar,
					winning_payout_1_p3 = EXCLUDED.winning_payout_1_p3,
					extraction_method = EXCLUDED.extraction_method,
					extraction_confidence = EXCLUDED.extraction_confidence,
					updated_at = CURRENT_TIMESTAMP
				RETURNING *
			`;
			const values = [
				winner.race_id,
				winner.winning_horse_number,
				winner.winning_payout_2_dollar,
				winner.winning_payout_1_p3,
				winner.extraction_method,
				winner.extraction_confidence
			];
			const result = await pool.query(query, values);
			logger.info("Race winner upserted successfully", { raceId: winner.race_id, horseNumber: winner.winning_horse_number });
			return result.rows[0];
		} catch (error: any) {
			logger.error("Error upserting race winner", { error: error.message, winner });
			throw error;
		}
	}

	/**
	 * Upsert a race winner with database client (for transactions)
	 */
	static async upsertWithClient(client: DatabaseClient, winner: Omit<RaceWinner, 'id' | 'created_at' | 'updated_at'>): Promise<RaceWinner> {
		try {
			const query = `
				INSERT INTO race_winners (
					race_id, winning_horse_number, winning_payout_2_dollar, 
					winning_payout_1_p3, extraction_method, extraction_confidence
				) VALUES ($1, $2, $3, $4, $5, $6)
				ON CONFLICT (race_id) 
				DO UPDATE SET
					winning_horse_number = EXCLUDED.winning_horse_number,
					winning_payout_2_dollar = EXCLUDED.winning_payout_2_dollar,
					winning_payout_1_p3 = EXCLUDED.winning_payout_1_p3,
					extraction_method = EXCLUDED.extraction_method,
					extraction_confidence = EXCLUDED.extraction_confidence,
					updated_at = CURRENT_TIMESTAMP
				RETURNING *
			`;
			const values = [
				winner.race_id,
				winner.winning_horse_number,
				winner.winning_payout_2_dollar,
				winner.winning_payout_1_p3,
				winner.extraction_method,
				winner.extraction_confidence
			];
			const result = await client.query(query, values);
			logger.info("Race winner upserted successfully with client", { raceId: winner.race_id, horseNumber: winner.winning_horse_number });
			return result.rows[0];
		} catch (error: any) {
			logger.error("Error upserting race winner with client", { error: error.message, winner });
			throw error;
		}
	}

	/**
	 * Delete a race winner by race ID
	 */
	static async deleteByRaceId(raceId: string): Promise<boolean> {
		try {
			const query = `DELETE FROM race_winners WHERE race_id = $1`;
			const result = await pool.query(query, [raceId]);
			const deleted = (result.rowCount || 0) > 0;
			if (deleted) {
				logger.info("Race winner deleted successfully", { raceId });
			}
			return deleted;
		} catch (error: any) {
			logger.error("Error deleting race winner", { error: error.message, raceId });
			throw error;
		}
	}

	/**
	 * Delete a race winner by race ID with database client (for transactions)
	 */
	static async deleteByRaceIdWithClient(client: DatabaseClient, raceId: string): Promise<boolean> {
		try {
			const query = `DELETE FROM race_winners WHERE race_id = $1`;
			const result = await client.query(query, [raceId]);
			const deleted = (result.rowCount || 0) > 0;
			if (deleted) {
				logger.info("Race winner deleted successfully with client", { raceId });
			}
			return deleted;
		} catch (error: any) {
			logger.error("Error deleting race winner with client", { error: error.message, raceId });
			throw error;
		}
	}

	/**
	 * Get all race winners for a specific date range
	 */
	static async findByDateRange(startDate: string, endDate: string): Promise<RaceWinner[]> {
		try {
			const query = `
				SELECT rw.* FROM race_winners rw
				JOIN races r ON rw.race_id = r.id
				WHERE r.date >= $1 AND r.date <= $2
				ORDER BY r.date, r.race_number
			`;
			const result = await pool.query(query, [startDate, endDate]);
			return result.rows;
		} catch (error: any) {
			logger.error("Error finding race winners by date range", { error: error.message, startDate, endDate });
			throw error;
		}
	}

	/**
	 * Get race winners by track
	 */
	static async findByTrack(trackId: number): Promise<RaceWinner[]> {
		try {
			const query = `
				SELECT rw.* FROM race_winners rw
				JOIN races r ON rw.race_id = r.id
				WHERE r.track_id = $1
				ORDER BY r.date, r.race_number
			`;
			const result = await pool.query(query, [trackId]);
			return result.rows;
		} catch (error: any) {
			logger.error("Error finding race winners by track", { error: error.message, trackId });
			throw error;
		}
	}
}
