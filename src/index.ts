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
import cors from "cors";
import config from "./config/config";
import betRoutes from "./routes/betRoutes";
import raceRoutes from "./routes/raceRoutes";
import logRoutes from "./routes/logRoutes";
import logger from "./config/logger";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { checkConnectionHealth } from "./config/database";
import { Request, Response, NextFunction } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

// Load package.json version dynamically
const packageJson = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));
const APP_VERSION = packageJson.version;

// Initialize the Express app
const app = express();

// CORS configuration
app.use(
	cors({
		origin: config.uiOrigin,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "x-api-key", "X-Source-Spreadsheet-URL", "x-source-spreadsheet-url"],
	})
);

app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
	const startTime = Date.now();
	const requestId = Math.random().toString(36).substring(7);

	// Skip logging for health checks (or log at lower level)
	const isHealthCheck = req.path === "/health" || req.path === "/health/db";

	// Log request start (only for non-health checks)
	if (!isHealthCheck) {
		const logMeta: any = {
			ip: req.ip,
			userAgent: req.get("user-agent"),
		};

		// Capture X-Source-Spreadsheet-URL header if present
		const spreadsheetUrl = req.get("x-source-spreadsheet-url") || req.get("X-Source-Spreadsheet-URL");
		if (spreadsheetUrl) {
			logMeta["x-source-spreadsheet-url"] = spreadsheetUrl;
		}

		logger.info(`[${requestId}] ${req.method} ${req.path}`, logMeta);
	}

	// Capture response finish
	res.on("finish", () => {
		const duration = Date.now() - startTime;
		if (!isHealthCheck) {
			const logLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
			logger[logLevel](`[${requestId}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`, {
				statusCode: res.statusCode,
				duration,
			});
		}
	});

	next();
});

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
app.use("/api/logs", logRoutes);
app.use("/api", betRoutes);
app.use("/api/races", raceRoutes);

// Export app for testing
export { app };

// Initialize database and start server
async function startServer() {
	try {
		// Test database connection
		const dbConnected = await checkConnectionHealth();
		if (!dbConnected) {
			logger.error("Failed to connect to database. Exiting...");
			process.exit(1);
		}

		logger.info("Database connection verified successfully");

		// Start the server
		const PORT = config.port;
		const server = app.listen(PORT, "0.0.0.0", () => {
			logger.info(`Server running on port ${PORT}`);
		});

		// Start log cleanup job (runs daily)
		// Clean up old logs beyond retention period
		const { cleanupOldLogs } = await import("./services/logStorageService");
		const runCleanup = async () => {
			try {
				await cleanupOldLogs(config.logRetentionDays);
			} catch (error: any) {
				logger.error("Log cleanup job failed", { error: error.message });
			}
		};

		// Run cleanup immediately on startup (in case server was down for a while)
		runCleanup();

		// Schedule daily cleanup (every 24 hours)
		const ONE_DAY_MS = 24 * 60 * 60 * 1000;
		const cleanupInterval = setInterval(runCleanup, ONE_DAY_MS);

		logger.info(`Log cleanup job scheduled (retention: ${config.logRetentionDays} days)`);

		// Start daily report scheduler
		const { scheduleDailyReport } = await import("./services/dailyReportScheduler");
		const reportTask = scheduleDailyReport();

		// Clean up interval and report scheduler on graceful shutdown
		const shutdown = async () => {
			try {
				clearInterval(cleanupInterval);
				reportTask.stop();
				logger.info("Log cleanup job stopped");
				logger.info("Daily report scheduler stopped");
				
				// Close database pool
				const { closeDatabasePool } = await import("./config/database");
				await closeDatabasePool();
				
				process.exit(0);
			} catch (error: any) {
				logger.error("Error during shutdown", { error: error.message });
				process.exit(1);
			}
		};
		process.on("SIGTERM", shutdown);
		process.on("SIGINT", shutdown);

	} catch (error: any) {
		logger.error("Failed to start server", { error: error.message });
		process.exit(1);
	}
}

// Start the server
startServer();