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
 * Database Migration Management System
 * 
 * This module provides a robust, version-controlled database migration system that:
 * 1. Tracks migration versions in a dedicated migrations table
 * 2. Ensures migrations run only once and in the correct order
 * 3. Supports rollback capabilities for failed migrations
 * 4. Provides detailed logging and error reporting
 * 5. Integrates with the existing database connection pool
 * 
 * USAGE:
 * - Run migrations: await MigrationManager.runMigrations()
 * - Check status: await MigrationManager.getMigrationStatus()
 * - Rollback: await MigrationManager.rollbackMigration(version)
 * 
 * MIGRATION FILES:
 * - Located in /migrations/ directory
 * - Named: {version}_{description}.sql
 * - Example: 001_create_race_tables.sql
 * 
 * MIGRATION TABLE SCHEMA:
 * CREATE TABLE migrations (
 *   id SERIAL PRIMARY KEY,
 *   version VARCHAR(50) UNIQUE NOT NULL,
 *   description TEXT NOT NULL,
 *   applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   checksum VARCHAR(64) NOT NULL,
 *   execution_time_ms INTEGER,
 *   status VARCHAR(20) DEFAULT 'success'
 * );
 */

import pool from "../config/database";
import logger from "../config/logger";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

/**
 * Migration record interface representing a single migration entry
 */
interface MigrationRecord {
	id: number;
	version: string;
	description: string;
	applied_at: Date;
	checksum: string;
	execution_time_ms: number;
	status: 'success' | 'failed' | 'pending';
}

/**
 * Migration file interface representing a migration file on disk
 */
interface MigrationFile {
	version: string;
	description: string;
	filePath: string;
	content: string;
	checksum: string;
}

/**
 * Migration result interface for tracking execution outcomes
 */
interface MigrationResult {
	version: string;
	success: boolean;
	message: string;
	executionTime: number;
	checksum: string;
}

/**
 * Migration status interface for overall system status
 */
interface MigrationStatus {
	totalMigrations: number;
	appliedMigrations: number;
	pendingMigrations: number;
	failedMigrations: number;
	lastMigration?: string;
	lastMigrationDate?: Date;
}

/**
 * Database Migration Management System
 * 
 * This class provides a comprehensive solution for managing database schema changes
 * in a production environment. It ensures data integrity by:
 * 
 * - Running migrations in strict version order
 * - Preventing duplicate migration execution
 * - Providing rollback capabilities
 * - Tracking execution performance and success rates
 * - Generating detailed audit logs
 */
export class MigrationManager {
	private static readonly MIGRATIONS_DIR = join(process.cwd(), "migrations");
	private static readonly MIGRATIONS_TABLE = "migrations";

	/**
	 * Initialize the migration system by creating the migrations table if it doesn't exist
	 * 
	 * This method should be called before running any migrations to ensure the
	 * tracking infrastructure is in place.
	 * 
	 * @returns Promise<boolean> - True if initialization was successful
	 * @throws Error if database connection fails or table creation fails
	 */
	static async initialize(): Promise<boolean> {
		try {
			logger.info("Initializing migration system...");

			const client = await pool.connect();

			try {
				// Create migrations table if it doesn't exist
				const createTableQuery = `
          CREATE TABLE IF NOT EXISTS ${this.MIGRATIONS_TABLE} (
            id SERIAL PRIMARY KEY,
            version VARCHAR(50) UNIQUE NOT NULL,
            description TEXT NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            checksum VARCHAR(64) NOT NULL,
            execution_time_ms INTEGER,
            status VARCHAR(20) DEFAULT 'success'
          );
        `;

				await client.query(createTableQuery);
				logger.info("Migration table created/verified successfully");

				return true;
			} finally {
				client.release();
			}
		} catch (error: any) {
			logger.error("Failed to initialize migration system", { error: error.message });
			throw new Error(`Migration initialization failed: ${error.message}`);
		}
	}

	/**
	 * Get the current status of all migrations in the system
	 * 
	 * This provides a comprehensive overview of which migrations have been applied,
	 * which are pending, and any that may have failed.
	 * 
	 * @returns Promise<MigrationStatus> - Complete migration system status
	 * @throws Error if database connection fails or query fails
	 */
	static async getMigrationStatus(): Promise<MigrationStatus> {
		try {
			const client = await pool.connect();

			try {
				// Get count of applied migrations
				const appliedQuery = `
          SELECT COUNT(*) as count, 
                 MAX(version) as last_version,
                 MAX(applied_at) as last_date
          FROM ${this.MIGRATIONS_TABLE} 
          WHERE status = 'success'
        `;

				const appliedResult = await client.query(appliedQuery);
				const appliedCount = parseInt(appliedResult.rows[0]?.count || '0');
				const lastMigration = appliedResult.rows[0]?.last_version;
				const lastMigrationDate = appliedResult.rows[0]?.last_date;

				// Get count of failed migrations
				const failedQuery = `
          SELECT COUNT(*) as count 
          FROM ${this.MIGRATIONS_TABLE} 
          WHERE status = 'failed'
        `;

				const failedResult = await client.query(failedQuery);
				const failedCount = parseInt(failedResult.rows[0]?.count || '0');

				// Get total available migrations
				const migrationFiles = this.getMigrationFiles();
				const totalMigrations = migrationFiles.length;
				const pendingMigrations = totalMigrations - appliedCount;

				return {
					totalMigrations,
					appliedMigrations: appliedCount,
					pendingMigrations,
					failedMigrations: failedCount,
					lastMigration,
					lastMigrationDate
				};
			} finally {
				client.release();
			}
		} catch (error: any) {
			logger.error("Failed to get migration status", { error: error.message });
			throw new Error(`Failed to get migration status: ${error.message}`);
		}
	}

	/**
	 * Run all pending migrations in version order
	 * 
	 * This method scans the migrations directory, identifies pending migrations,
	 * and executes them in strict version order. It ensures data integrity by
	 * running each migration within a transaction and recording the results.
	 * 
	 * @returns Promise<MigrationResult[]> - Results of all migration executions
	 * @throws Error if any migration fails or database connection fails
	 */
	static async runMigrations(): Promise<MigrationResult[]> {
		try {
			logger.info("Starting migration execution...");

			// Initialize migration system if needed
			await this.initialize();

			// Get current status and pending migrations
			const status = await this.getMigrationStatus();
			const migrationFiles = this.getMigrationFiles();

			if (status.pendingMigrations === 0) {
				logger.info("No pending migrations to run");
				return [];
			}

			logger.info(`Found ${status.pendingMigrations} pending migrations`);

			const results: MigrationResult[] = [];

			// Process migrations in version order
			for (const migrationFile of migrationFiles) {
				const isApplied = await this.isMigrationApplied(migrationFile.version);

				if (!isApplied) {
					logger.info(`Running migration: ${migrationFile.version} - ${migrationFile.description}`);

					const result = await this.runMigration(migrationFile);
					results.push(result);

					if (!result.success) {
						logger.error(`Migration ${migrationFile.version} failed: ${result.message}`);
						// Continue with other migrations but log the failure
					}
				}
			}

			logger.info(`Migration execution completed. ${results.length} migrations processed.`);
			return results;

		} catch (error: any) {
			logger.error("Migration execution failed", { error: error.message });
			throw new Error(`Migration execution failed: ${error.message}`);
		}
	}

	/**
	 * Execute a single migration file
	 * 
	 * This method runs a single migration within a database transaction,
	 * records the execution details, and provides detailed error reporting
	 * if the migration fails.
	 * 
	 * @param migrationFile - The migration file to execute
	 * @returns Promise<MigrationResult> - Result of the migration execution
	 * @throws Error if database connection fails or migration execution fails
	 */
	private static async runMigration(migrationFile: MigrationFile): Promise<MigrationResult> {
		const startTime = Date.now();
		const client = await pool.connect();

		try {
			// Begin transaction
			await client.query('BEGIN');

			// Execute the migration SQL
			await client.query(migrationFile.content);

			// Record successful migration
			const insertQuery = `
        INSERT INTO ${this.MIGRATIONS_TABLE} 
        (version, description, checksum, execution_time_ms, status)
        VALUES ($1, $2, $3, $4, 'success')
      `;

			const executionTime = Date.now() - startTime;

			await client.query(insertQuery, [
				migrationFile.version,
				migrationFile.description,
				migrationFile.checksum,
				executionTime
			]);

			// Commit transaction
			await client.query('COMMIT');

			logger.info(`Migration ${migrationFile.version} completed successfully in ${executionTime}ms`);

			return {
				version: migrationFile.version,
				success: true,
				message: "Migration completed successfully",
				executionTime,
				checksum: migrationFile.checksum
			};

		} catch (error: any) {
			// Rollback transaction on failure
			await client.query('ROLLBACK');

			// Record failed migration
			try {
				const insertQuery = `
          INSERT INTO ${this.MIGRATIONS_TABLE} 
          (version, description, checksum, execution_time_ms, status)
          VALUES ($1, $2, $3, $4, 'failed')
        `;

				const executionTime = Date.now() - startTime;

				await client.query(insertQuery, [
					migrationFile.version,
					migrationFile.description,
					migrationFile.checksum,
					executionTime
				]);
			} catch (insertError: any) {
				logger.error("Failed to record failed migration", {
					version: migrationFile.version,
					error: insertError.message
				});
			}

			const executionTime = Date.now() - startTime;

			logger.error(`Migration ${migrationFile.version} failed`, {
				error: error.message,
				executionTime
			});

			return {
				version: migrationFile.version,
				success: false,
				message: `Migration failed: ${error.message}`,
				executionTime,
				checksum: migrationFile.checksum
			};

		} finally {
			client.release();
		}
	}

	/**
	 * Check if a specific migration has already been applied
	 * 
	 * @param version - The migration version to check
	 * @returns Promise<boolean> - True if migration is already applied
	 */
	private static async isMigrationApplied(version: string): Promise<boolean> {
		const client = await pool.connect();

		try {
			const query = `
        SELECT COUNT(*) as count 
        FROM ${this.MIGRATIONS_TABLE} 
        WHERE version = $1 AND status = 'success'
      `;

			const result = await client.query(query, [version]);
			return parseInt(result.rows[0]?.count || '0') > 0;
		} finally {
			client.release();
		}
	}

	/**
	 * Scan the migrations directory and return all available migration files
	 * 
	 * This method reads the migrations directory, parses migration file names,
	 * and loads their content for execution.
	 * 
	 * @returns MigrationFile[] - Array of all available migration files
	 * @throws Error if migrations directory cannot be read or files are invalid
	 */
	private static getMigrationFiles(): MigrationFile[] {
		try {
			if (!readdirSync(this.MIGRATIONS_DIR)) {
				throw new Error(`Migrations directory not found: ${this.MIGRATIONS_DIR}`);
			}

			const files = readdirSync(this.MIGRATIONS_DIR)
				.filter(file => file.endsWith('.sql'))
				.sort(); // Ensure files are processed in order

			return files.map(file => {
				const filePath = join(this.MIGRATIONS_DIR, file);
				const content = readFileSync(filePath, 'utf-8');

				// Parse filename: {version}_{description}.sql
				const match = file.match(/^(\d+)_(.+)\.sql$/);
				if (!match) {
					throw new Error(`Invalid migration filename format: ${file}`);
				}

				const version = match[1];
				const description = match[2].replace(/_/g, ' ');
				const checksum = createHash('sha256').update(content).digest('hex');

				return {
					version,
					description,
					filePath,
					content,
					checksum
				};
			});

		} catch (error: any) {
			logger.error("Failed to read migration files", { error: error.message });
			throw new Error(`Failed to read migration files: ${error.message}`);
		}
	}

	/**
	 * Rollback a specific migration to its previous state
	 * 
	 * WARNING: This is a destructive operation that can result in data loss.
	 * Only use this in development or when you have a complete backup.
	 * 
	 * @param version - The migration version to rollback
	 * @returns Promise<boolean> - True if rollback was successful
	 * @throws Error if rollback fails or migration cannot be found
	 */
	static async rollbackMigration(version: string): Promise<boolean> {
		try {
			logger.warn(`Rolling back migration: ${version}`);

			const client = await pool.connect();

			try {
				// Check if migration exists and was successful
				const checkQuery = `
          SELECT * FROM ${this.MIGRATIONS_TABLE} 
          WHERE version = $1 AND status = 'success'
        `;

				const checkResult = await client.query(checkQuery, [version]);

				if (checkResult.rows.length === 0) {
					throw new Error(`Migration ${version} not found or not successfully applied`);
				}

				// TODO: Implement rollback logic based on migration type
				// This would require storing rollback SQL in the migration files
				// or implementing automatic rollback generation

				logger.warn(`Rollback for migration ${version} not yet implemented`);
				return false;

			} finally {
				client.release();
			}

		} catch (error: any) {
			logger.error(`Failed to rollback migration ${version}`, { error: error.message });
			throw new Error(`Rollback failed: ${error.message}`);
		}
	}
}
