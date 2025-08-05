-- Migration: Create race tables
-- Description: Creates the tracks, races, and race_entries tables for the race data ingestion system

-- Create tracks table
CREATE TABLE IF NOT EXISTS tracks (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,  -- e.g., 'AQU', 'BEL', 'CD'
    name VARCHAR(100) NOT NULL,        -- e.g., 'AQUEDUCT', 'BELMONT', 'CHURCHILL'
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create races table
CREATE TABLE IF NOT EXISTS races (
    id TEXT PRIMARY KEY,               -- Format: TRACKCODE_YYYYMMDD_RACENUMBER (e.g., 'AQU_20250427_3')
    track_id INTEGER NOT NULL REFERENCES tracks(id),
    date DATE NOT NULL,                -- Race date (converted from MM-DD-YY to YYYY-MM-DD)
    race_number INTEGER NOT NULL,      -- Race number (3-15)
    
    -- Previous race winners (for races 3-15)
    prev_race_1_winner_horse_number INTEGER,    -- Horse number of previous race winner
    prev_race_1_winner_payout NUMERIC(10,2),   -- Winner payout amount
    prev_race_2_winner_horse_number INTEGER,    -- Horse number of 2 races ago winner  
    prev_race_2_winner_payout NUMERIC(10,2),   -- Winner payout amount
    
    -- Race metadata
    source_file VARCHAR(500),          -- Original source identifier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT race_number_valid CHECK (race_number >= 3 AND race_number <= 15),
    CONSTRAINT unique_race_per_track_date UNIQUE (track_id, date, race_number)
);

-- Create race_entries table
CREATE TABLE IF NOT EXISTS race_entries (
    id SERIAL PRIMARY KEY,
    race_id TEXT NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    
    -- Core horse data
    horse_number INTEGER NOT NULL,
    double NUMERIC(10,2),              -- Double odds
    constant NUMERIC(10,2),            -- Constant value
    p3 NUMERIC(10,2),                  -- Pick 3 value
    ml NUMERIC(10,2),                  -- Morning line odds
    live_odds NUMERIC(10,2),           -- Live odds
    sharp_percent VARCHAR(20),         -- Sharp action percentage (e.g., "107.44%")
    action NUMERIC(10,2),              -- Action value
    double_delta NUMERIC(10,2),        -- Double delta
    p3_delta NUMERIC(10,2),            -- P3 delta
    x_figure NUMERIC(10,2),            -- X figure
    will_pay_2 VARCHAR(50),            -- $2 Will Pay amount
    will_pay_1_p3 VARCHAR(50),         -- $1 P3 Will Pay amount
    win_pool VARCHAR(50),              -- Win pool amount
    veto_rating VARCHAR(20),           -- Veto rating
    
    -- Metadata fields
    raw_data TEXT,                     -- Raw extracted data for debugging
    source_file VARCHAR(500),          -- Original source identifier
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints  
    CONSTRAINT horse_number_valid CHECK (horse_number >= 1 AND horse_number <= 16),
    CONSTRAINT unique_horse_per_race UNIQUE (race_id, horse_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_races_track_date ON races(track_id, date);
CREATE INDEX IF NOT EXISTS idx_races_date ON races(date);
CREATE INDEX IF NOT EXISTS idx_race_entries_race_id ON race_entries(race_id);
CREATE INDEX IF NOT EXISTS idx_tracks_code ON tracks(code);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON tracks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON races
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_race_entries_updated_at BEFORE UPDATE ON race_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 