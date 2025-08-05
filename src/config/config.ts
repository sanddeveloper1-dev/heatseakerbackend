import dotenv from "dotenv";

dotenv.config();

export default {
  port: Number(process.env.PORT) || 8080,
  apiKey: process.env.API_KEY || "default-api-key",
  database: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  },
};