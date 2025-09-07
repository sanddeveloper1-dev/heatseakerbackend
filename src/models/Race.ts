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
 * Race data model and database operations for race management
 */

import pool from "../config/database";
import logger from "../config/logger";
import { DatabaseClient } from "../types/raceTypes";

export interface Race {
	id?: string;
	track_id: number;
	date: Date;
	race_number: number;
	post_time?: string;  // New field for race post time
	source_file?: string;
	created_at?: Date;
	updated_at?: Date;
}

export class RaceModel {
	/**
	 * Find a race by its ID
	 */
	static async findById(id: string): Promise<Race | null> {
		try {
			const result = await pool.query(
				"SELECT * FROM races WHERE id = $1",
				[id]
			);
			return result.rows[0] || null;
		} catch (error) {
			logger.error("Error finding race by ID", { id, error });
			throw error;
		}
	}

	/**
	 * Find a race by track, date, and race number
	 */
	static async findByTrackDateRace(
		trackId: number,
		date: Date,
		raceNumber: number
	): Promise<Race | null> {
		try {
			const result = await pool.query(
				"SELECT * FROM races WHERE track_id = $1 AND date = $2 AND race_number = $3",
				[trackId, date, raceNumber]
			);
			return result.rows[0] || null;
		} catch (error) {
			logger.error("Error finding race by track/date/race", {
				trackId, date, raceNumber, error
			});
			throw error;
		}
	}

	/**
	 * Find a race by track, date, and race number with database client (for transactions)
	 */
	static async findByTrackDateRaceWithClient(
		client: DatabaseClient,
		trackId: number,
		date: Date,
		raceNumber: number
	): Promise<Race | null> {
		try {
			const result = await client.query(
				"SELECT * FROM races WHERE track_id = $1 AND date = $2 AND race_number = $3",
				[trackId, date, raceNumber]
			);
			return result.rows[0] || null;
		} catch (error) {
			logger.error("Error finding race by track/date/race with client", {
				trackId, date, raceNumber, error
			});
			throw error;
		}
	}

	/**
	 * Create a new race
	 */
	static async create(race: Race): Promise<Race> {
		try {
			const result = await pool.query(
				`INSERT INTO races (
          id, track_id, date, race_number, post_time, source_file
        ) VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *`,
				[
					race.id,
					race.track_id,
					race.date,
					race.race_number,
					race.post_time,
					race.source_file,
				]
			);
			return result.rows[0];
		} catch (error) {
			logger.error("Error creating race", { race, error });
			throw error;
		}
	}

	/**
	 * Create a new race with database client (for transactions)
	 */
	static async createWithClient(client: DatabaseClient, race: Race): Promise<Race> {
		try {
			const result = await client.query(
				`INSERT INTO races (
          id, track_id, date, race_number, post_time, source_file
        ) VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *`,
				[
					race.id,
					race.track_id,
					race.date,
					race.race_number,
					race.post_time,
					race.source_file,
				]
			);
			return result.rows[0];
		} catch (error) {
			logger.error("Error creating race with client", { race, error });
			throw error;
		}
	}

	/**
	 * Update an existing race
	 */
	static async update(race: Race): Promise<Race> {
		try {
			const result = await pool.query(
				`UPDATE races SET 
          track_id = $2, date = $3, race_number = $4, post_time = $5,
          source_file = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 
        RETURNING *`,
				[
					race.id,
					race.track_id,
					race.date,
					race.race_number,
					race.post_time,
					race.source_file,
				]
			);
			return result.rows[0];
		} catch (error) {
			logger.error("Error updating race", { race, error });
			throw error;
		}
	}

	/**
	 * Update an existing race with database client (for transactions)
	 */
	static async updateWithClient(client: DatabaseClient, race: Race): Promise<Race> {
		try {
			const result = await client.query(
				`UPDATE races SET 
          track_id = $2, date = $3, race_number = $4, post_time = $5,
          source_file = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 
        RETURNING *`,
				[
					race.id,
					race.track_id,
					race.date,
					race.race_number,
					race.post_time,
					race.source_file,
				]
			);
			return result.rows[0];
		} catch (error) {
			logger.error("Error updating race with client", { race, error });
			throw error;
		}
	}

	/**
	 * Upsert a race (insert or update)
	 */
	static async upsert(race: Race): Promise<Race> {
		try {
			const existingRace = await this.findByTrackDateRace(
				race.track_id,
				race.date,
				race.race_number
			);

			if (existingRace) {
				// Update existing race
				race.id = existingRace.id;
				return await this.update(race);
			} else {
				// Create new race
				return await this.create(race);
			}
		} catch (error) {
			logger.error("Error in upsert race", { race, error });
			throw error;
		}
	}

	/**
	 * Upsert a race with database client (for transactions)
	 */
	static async upsertWithClient(client: DatabaseClient, race: Race): Promise<Race> {
		try {
			const existingRace = await this.findByTrackDateRaceWithClient(
				client,
				race.track_id,
				race.date,
				race.race_number
			);

			if (existingRace) {
				// Update existing race
				race.id = existingRace.id;
				return await this.updateWithClient(client, race);
			} else {
				// Create new race
				return await this.createWithClient(client, race);
			}
		} catch (error) {
			logger.error("Error in upsertWithClient race", { race, error });
			throw error;
		}
	}

	/**
	 * Get races by date range
	 */
	static async findByDateRange(startDate: Date, endDate: Date): Promise<Race[]> {
		try {
			const result = await pool.query(
				`SELECT r.*, t.name as track_name 
         FROM races r 
         JOIN tracks t ON r.track_id = t.id 
         WHERE r.date BETWEEN $1 AND $2 
         ORDER BY r.date DESC, t.name, r.race_number`,
				[startDate, endDate]
			);
			return result.rows;
		} catch (error) {
			logger.error("Error finding races by date range", { startDate, endDate, error });
			throw error;
		}
	}
} 