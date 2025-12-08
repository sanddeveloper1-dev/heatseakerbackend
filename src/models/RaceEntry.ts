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
 * Race entry data model and database operations for race entry management
 */

import pool from "../config/database";
import logger from "../config/logger";
import { DatabaseClient } from "../types/raceTypes";

export interface RaceEntry {
	id?: number;
	race_id: string;
	horse_number: number;
	double?: number;
	constant?: number;
	p3?: string;  // Changed to string to handle 'FALSE' values
	correct_p3?: number;  // New field
	ml?: number;
	live_odds?: number;
	sharp_percent?: string;
	action?: number;
	double_delta?: number;
	p3_delta?: number;
	x_figure?: number;
	will_pay_2?: string;
	will_pay?: string;  // New field
	will_pay_1_p3?: string;
	win_pool?: string;
	veto_rating?: string;
	purse?: string;
	race_type?: string;
	age?: string;
	raw_data?: string;
	source_file?: string;
	created_at?: Date;
	updated_at?: Date;
}

export class RaceEntryModel {
	/**
	 * Find entries by race ID
	 */
	static async findByRaceId(raceId: string): Promise<RaceEntry[]> {
		try {
			const result = await pool.query(
				"SELECT * FROM race_entries WHERE race_id = $1 ORDER BY horse_number",
				[raceId]
			);
			return result.rows;
		} catch (error) {
			logger.error("Error finding entries by race ID", { raceId, error });
			throw error;
		}
	}

	/**
	 * Find a specific entry by race ID and horse number
	 */
	static async findByRaceAndHorse(raceId: string, horseNumber: number): Promise<RaceEntry | null> {
		try {
			const result = await pool.query(
				"SELECT * FROM race_entries WHERE race_id = $1 AND horse_number = $2",
				[raceId, horseNumber]
			);
			return result.rows[0] || null;
		} catch (error) {
			logger.error("Error finding entry by race and horse", { raceId, horseNumber, error });
			throw error;
		}
	}

	/**
	 * Find a specific entry by race ID and horse number with database client (for transactions)
	 */
	static async findByRaceAndHorseWithClient(client: DatabaseClient, raceId: string, horseNumber: number): Promise<RaceEntry | null> {
		try {
			const result = await client.query(
				"SELECT * FROM race_entries WHERE race_id = $1 AND horse_number = $2",
				[raceId, horseNumber]
			);
			return result.rows[0] || null;
		} catch (error) {
			logger.error("Error finding entry by race and horse with client", { raceId, horseNumber, error });
			throw error;
		}
	}

	/**
	 * Create a new race entry
	 */
	static async create(entry: RaceEntry): Promise<RaceEntry> {
		try {
			const result = await pool.query(
				`INSERT INTO race_entries (
          race_id, horse_number, double, constant, p3, correct_p3, ml, live_odds,
          sharp_percent, action, double_delta, p3_delta, x_figure,
          will_pay_2, will_pay, will_pay_1_p3, win_pool, veto_rating, purse, race_type, age, raw_data, source_file
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) 
        RETURNING *`,
				[
					entry.race_id,
					entry.horse_number,
					entry.double,
					entry.constant,
					entry.p3,
					entry.correct_p3,
					entry.ml,
					entry.live_odds,
					entry.sharp_percent,
					entry.action,
					entry.double_delta,
					entry.p3_delta,
					entry.x_figure,
					entry.will_pay_2,
					entry.will_pay,
					entry.will_pay_1_p3,
					entry.win_pool,
					entry.veto_rating,
					entry.purse,
					entry.race_type,
					entry.age,
					entry.raw_data,
					entry.source_file,
				]
			);
			return result.rows[0];
		} catch (error) {
			logger.error("Error creating race entry", { entry, error });
			throw error;
		}
	}

	/**
	 * Create a new race entry with database client (for transactions)
	 */
	static async createWithClient(client: DatabaseClient, entry: RaceEntry): Promise<RaceEntry> {
		try {
			const result = await client.query(
				`INSERT INTO race_entries (
          race_id, horse_number, double, constant, p3, correct_p3, ml, live_odds,
          sharp_percent, action, double_delta, p3_delta, x_figure,
          will_pay_2, will_pay, will_pay_1_p3, win_pool, veto_rating, purse, race_type, age, raw_data, source_file
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) 
        RETURNING *`,
				[
					entry.race_id,
					entry.horse_number,
					entry.double,
					entry.constant,
					entry.p3,
					entry.correct_p3,
					entry.ml,
					entry.live_odds,
					entry.sharp_percent,
					entry.action,
					entry.double_delta,
					entry.p3_delta,
					entry.x_figure,
					entry.will_pay_2,
					entry.will_pay,
					entry.will_pay_1_p3,
					entry.win_pool,
					entry.veto_rating,
					entry.purse,
					entry.race_type,
					entry.age,
					entry.raw_data,
					entry.source_file,
				]
			);
			return result.rows[0];
		} catch (error) {
			logger.error("Error creating race entry with client", { entry, error });
			throw error;
		}
	}

	/**
	 * Update an existing race entry
	 */
	static async update(entry: RaceEntry): Promise<RaceEntry> {
		try {
			const result = await pool.query(
				`UPDATE race_entries SET 
          double = $3, constant = $4, p3 = $5, correct_p3 = $6, ml = $7, live_odds = $8,
          sharp_percent = $9, action = $10, double_delta = $11, p3_delta = $12,
          x_figure = $13, will_pay_2 = $14, will_pay = $15, will_pay_1_p3 = $16, win_pool = $17,
          veto_rating = $18, purse = $19, race_type = $20, age = $21, raw_data = $22, source_file = $23, updated_at = CURRENT_TIMESTAMP
        WHERE race_id = $1 AND horse_number = $2 
        RETURNING *`,
				[
					entry.race_id,
					entry.horse_number,
					entry.double,
					entry.constant,
					entry.p3,
					entry.correct_p3,
					entry.ml,
					entry.live_odds,
					entry.sharp_percent,
					entry.action,
					entry.double_delta,
					entry.p3_delta,
					entry.x_figure,
					entry.will_pay_2,
					entry.will_pay,
					entry.will_pay_1_p3,
					entry.win_pool,
					entry.veto_rating,
					entry.purse,
					entry.race_type,
					entry.age,
					entry.raw_data,
					entry.source_file,
				]
			);
			return result.rows[0];
		} catch (error) {
			logger.error("Error updating race entry", { entry, error });
			throw error;
		}
	}

	/**
	 * Update an existing race entry with database client (for transactions)
	 */
	static async updateWithClient(client: DatabaseClient, entry: RaceEntry): Promise<RaceEntry> {
		try {
			const result = await client.query(
				`UPDATE race_entries SET 
          double = $3, constant = $4, p3 = $5, correct_p3 = $6, ml = $7, live_odds = $8,
          sharp_percent = $9, action = $10, double_delta = $11, p3_delta = $12,
          x_figure = $13, will_pay_2 = $14, will_pay = $15, will_pay_1_p3 = $16, win_pool = $17,
          veto_rating = $18, purse = $19, race_type = $20, age = $21, raw_data = $22, source_file = $23, updated_at = CURRENT_TIMESTAMP
        WHERE race_id = $1 AND horse_number = $2 
        RETURNING *`,
				[
					entry.race_id,
					entry.horse_number,
					entry.double,
					entry.constant,
					entry.p3,
					entry.correct_p3,
					entry.ml,
					entry.live_odds,
					entry.sharp_percent,
					entry.action,
					entry.double_delta,
					entry.p3_delta,
					entry.x_figure,
					entry.will_pay_2,
					entry.will_pay,
					entry.will_pay_1_p3,
					entry.win_pool,
					entry.veto_rating,
					entry.purse,
					entry.race_type,
					entry.age,
					entry.raw_data,
					entry.source_file,
				]
			);
			return result.rows[0];
		} catch (error) {
			logger.error("Error updating race entry with client", { entry, error });
			throw error;
		}
	}

	/**
	 * Upsert a race entry (insert or update)
	 */
	static async upsert(entry: RaceEntry): Promise<RaceEntry> {
		try {
			const existingEntry = await this.findByRaceAndHorse(entry.race_id, entry.horse_number);

			if (existingEntry) {
				// Update existing entry
				return await this.update(entry);
			} else {
				// Create new entry
				return await this.create(entry);
			}
		} catch (error) {
			logger.error("Error in upsert race entry", { entry, error });
			throw error;
		}
	}

	/**
	 * Upsert a race entry with database client (for transactions)
	 */
	static async upsertWithClient(client: DatabaseClient, entry: RaceEntry): Promise<RaceEntry> {
		try {
			const existingEntry = await this.findByRaceAndHorseWithClient(client, entry.race_id, entry.horse_number);

			if (existingEntry) {
				// Update existing entry
				return await this.updateWithClient(client, entry);
			} else {
				// Create new entry
				return await this.createWithClient(client, entry);
			}
		} catch (error) {
			logger.error("Error in upsertWithClient race entry", { entry, error });
			throw error;
		}
	}

	/**
	 * Batch upsert multiple entries for a race
	 */
	static async batchUpsert(entries: RaceEntry[]): Promise<RaceEntry[]> {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			const results: RaceEntry[] = [];
			for (const entry of entries) {
				const result = await this.upsert(entry);
				results.push(result);
			}

			await client.query("COMMIT");
			return results;
		} catch (error) {
			await client.query("ROLLBACK");
			logger.error("Error in batch upsert race entries", { error });
			throw error;
		} finally {
			client.release();
		}
	}

	/**
	 * Batch upsert multiple entries for a race with database client (for transactions)
	 */
	static async batchUpsertWithClient(client: DatabaseClient, entries: RaceEntry[]): Promise<RaceEntry[]> {
		try {
			if (entries.length === 0) {
				return [];
			}

			// Use bulk operations for better performance
			const results: RaceEntry[] = [];

			// Group entries by operation type (insert vs update)
			const toInsert: RaceEntry[] = [];
			const toUpdate: RaceEntry[] = [];

			for (const entry of entries) {
				const existingEntry = await this.findByRaceAndHorseWithClient(client, entry.race_id, entry.horse_number);
				if (existingEntry) {
					toUpdate.push(entry);
				} else {
					toInsert.push(entry);
				}
			}

			// Bulk insert new entries
			if (toInsert.length > 0) {
				const insertValues = toInsert.map((entry, index) => {
					const offset = index * 23; // 23 fields per entry
					return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23})`;
				}).join(', ');

				const insertParams = toInsert.flatMap(entry => [
					entry.race_id, entry.horse_number, entry.double, entry.constant, entry.p3, entry.correct_p3, entry.ml, entry.live_odds,
					entry.sharp_percent, entry.action, entry.double_delta, entry.p3_delta, entry.x_figure,
					entry.will_pay_2, entry.will_pay, entry.will_pay_1_p3, entry.win_pool, entry.veto_rating, entry.purse, entry.race_type, entry.age, entry.raw_data, entry.source_file
				]);

				const insertResult = await client.query(
					`INSERT INTO race_entries (
						race_id, horse_number, double, constant, p3, correct_p3, ml, live_odds,
						sharp_percent, action, double_delta, p3_delta, x_figure,
						will_pay_2, will_pay, will_pay_1_p3, win_pool, veto_rating, purse, race_type, age, raw_data, source_file
					) VALUES ${insertValues} RETURNING *`,
					insertParams
				);

				results.push(...insertResult.rows);
			}

			// Update existing entries
			for (const entry of toUpdate) {
				const result = await this.updateWithClient(client, entry);
				results.push(result);
			}

			return results;
		} catch (error) {
			logger.error("Error in batch upsert race entries with client", { error });
			throw error;
		}
	}

	/**
	 * Delete all entries for a race (useful for replacing all entries)
	 */
	static async deleteByRaceId(raceId: string): Promise<void> {
		try {
			await pool.query("DELETE FROM race_entries WHERE race_id = $1", [raceId]);
			logger.info("Deleted all entries for race", { raceId });
		} catch (error) {
			logger.error("Error deleting entries by race ID", { raceId, error });
			throw error;
		}
	}
} 