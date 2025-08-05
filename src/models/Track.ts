import pool from "../config/database";
import logger from "../config/logger";

export interface Track {
	id?: number;
	code: string;
	name: string;
	location?: string;
	created_at?: Date;
	updated_at?: Date;
}

export class TrackModel {
	/**
	 * Find a track by its code
	 */
	static async findByCode(code: string): Promise<Track | null> {
		try {
			const result = await pool.query(
				"SELECT * FROM tracks WHERE code = $1",
				[code]
			);
			return result.rows[0] || null;
		} catch (error) {
			logger.error("Error finding track by code", { code, error });
			throw error;
		}
	}

	/**
	 * Create a new track
	 */
	static async create(track: Track): Promise<Track> {
		try {
			const result = await pool.query(
				`INSERT INTO tracks (code, name, location) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
				[track.code, track.name, track.location]
			);
			return result.rows[0];
		} catch (error) {
			logger.error("Error creating track", { track, error });
			throw error;
		}
	}

	/**
	 * Get or create a track (upsert functionality)
	 */
	static async getOrCreate(track: Track): Promise<Track> {
		try {
			// Try to find existing track
			const existingTrack = await this.findByCode(track.code);
			if (existingTrack) {
				return existingTrack;
			}

			// Create new track if not found
			return await this.create(track);
		} catch (error) {
			logger.error("Error in getOrCreate track", { track, error });
			throw error;
		}
	}

	/**
	 * Get all tracks
	 */
	static async findAll(): Promise<Track[]> {
		try {
			const result = await pool.query("SELECT * FROM tracks ORDER BY name");
			return result.rows;
		} catch (error) {
			logger.error("Error finding all tracks", { error });
			throw error;
		}
	}
} 