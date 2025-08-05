import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import pool from "../config/database";
import logger from "../config/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

/**
 * Initialize the database with the required schema
 */
export async function initializeDatabase(): Promise<void> {
	try {
		logger.info("Starting database initialization...");

		// Read the migration file
		const migrationPath = join(__dirname, "../../migrations/001_create_race_tables.sql");
		const migrationSQL = readFileSync(migrationPath, "utf-8");

		// Execute the migration
		await pool.query(migrationSQL);

		logger.info("Database initialization completed successfully");
	} catch (error: any) {
		logger.error("Database initialization failed", { error: error.message });
		throw error;
	}
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
	try {
		const result = await pool.query("SELECT NOW() as current_time");
		logger.info("Database connection test successful", {
			currentTime: result.rows[0].current_time
		});
		return true;
	} catch (error: any) {
		logger.error("Database connection test failed", { error: error.message });
		return false;
	}
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
	try {
		await pool.end();
		logger.info("Database connection pool closed");
	} catch (error: any) {
		logger.error("Error closing database connection pool", { error: error.message });
	}
} 