import { Pool, PoolClient } from "pg";
import config from "./config";
import logger from "./logger";

// Create a connection pool
const pool = new Pool(config.database);

// Test the connection
pool.on("connect", (client: PoolClient) => {
	logger.info("Connected to PostgreSQL database");
});

pool.on("error", (err: Error) => {
	logger.error("Unexpected error on idle client", err);
	process.exit(-1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
	logger.info("Shutting down database pool...");
	await pool.end();
	process.exit(0);
});

export default pool; 