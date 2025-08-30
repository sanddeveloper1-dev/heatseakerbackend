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
 * Main application entry point and server initialization
 */

import express from "express";
import config from "./config/config";
import betRoutes from "./routes/betRoutes";
import raceRoutes from "./routes/raceRoutes";
import logger from "./config/logger";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { initializeDatabase, testDatabaseConnection } from "./utils/dbInit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

// Load package.json version dynamically
const packageJson = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));
const APP_VERSION = packageJson.version;

// Initialize the Express app
const app = express();
app.use(express.json());

// Add the health check route
app.get("/health", (req, res) => {
	res.status(200).json({
		status: "UP",
		message: "Application is running smoothly!",
		timestamp: new Date().toISOString(),
		version: APP_VERSION,
	});
});

// Add database health check route
app.get("/health/db", async (req, res) => {
	try {
		const { checkConnectionHealth } = await import("./config/database");
		const isHealthy = await checkConnectionHealth();

		if (isHealthy) {
			res.status(200).json({
				status: "UP",
				message: "Database connection is healthy",
				timestamp: new Date().toISOString(),
				version: APP_VERSION,
			});
		} else {
			res.status(503).json({
				status: "DOWN",
				message: "Database connection is unhealthy",
				timestamp: new Date().toISOString(),
				version: APP_VERSION,
			});
		}
	} catch (error: any) {
		res.status(503).json({
			status: "ERROR",
			message: "Database health check failed",
			error: error.message,
			timestamp: new Date().toISOString(),
			version: APP_VERSION,
		});
	}
});

// Mount routes
app.use("/api", betRoutes);
app.use("/api/races", raceRoutes);

// Export app for testing
export { app };

// Initialize database and start server
async function startServer() {
	try {
		// Test database connection
		const dbConnected = await testDatabaseConnection();
		if (!dbConnected) {
			logger.error("Failed to connect to database. Exiting...");
			process.exit(1);
		}

		// Initialize database schema
		await initializeDatabase();

		// Start the server
		const PORT = config.port;
		const server = app.listen(PORT, "0.0.0.0", () => {
			logger.info(`Server running on port ${PORT}`);
			console.log(`Server running on port ${PORT}`);
		});

	} catch (error: any) {
		logger.error("Failed to start server", { error: error.message });
		process.exit(1);
	}
}

// Start the server
startServer();