-- HeatSeaker Backend - Application Logs Table Migration
-- Copyright (c) 2024 Paul Stortini
-- Software Development & Maintenance by Alexander Meyer

-- Create logs table for persistent log storage
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
    message TEXT NOT NULL,
    meta JSONB,  -- Store metadata as JSON for flexible querying
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp_level ON logs(timestamp DESC, level);
CREATE INDEX IF NOT EXISTS idx_logs_message_search ON logs USING gin(to_tsvector('english', message));
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- Add comments for documentation
COMMENT ON TABLE logs IS 'Application logs with 90-day retention period';
COMMENT ON COLUMN logs.timestamp IS 'Log entry timestamp (ISO format)';
COMMENT ON COLUMN logs.level IS 'Log level: info, warn, error, or debug';
COMMENT ON COLUMN logs.message IS 'Log message text';
COMMENT ON COLUMN logs.meta IS 'Additional metadata as JSON object';
