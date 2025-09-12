-- HeatSeaker Backend - Race Winners Table Migration
-- Copyright (c) 2024 Paul Stortini
-- Software Development & Maintenance by Alexander Meyer

-- Create race_winners table with comprehensive schema
CREATE TABLE IF NOT EXISTS race_winners (
    id SERIAL PRIMARY KEY,
    race_id TEXT NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    winning_horse_number INTEGER NOT NULL,
    winning_payout_2_dollar NUMERIC(10,2),    -- $2 payout for the winner
    winning_payout_1_p3 NUMERIC(10,2),        -- $1 P3 payout for the winner (optional)
    extraction_method VARCHAR(50),            -- 'simple_correct', 'header', 'summary', 'cross_reference'
    extraction_confidence VARCHAR(20),        -- 'high', 'medium', 'low'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT winning_horse_number_valid CHECK (winning_horse_number >= 1 AND winning_horse_number <= 16),
    CONSTRAINT unique_winner_per_race UNIQUE (race_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_race_winners_race_id ON race_winners(race_id);
CREATE INDEX IF NOT EXISTS idx_race_winners_horse_number ON race_winners(winning_horse_number);
CREATE INDEX IF NOT EXISTS idx_race_winners_extraction_method ON race_winners(extraction_method);
CREATE INDEX IF NOT EXISTS idx_race_winners_confidence ON race_winners(extraction_confidence);
CREATE INDEX IF NOT EXISTS idx_race_winners_created_at ON race_winners(created_at);

-- Add comments for documentation
COMMENT ON TABLE race_winners IS 'Race winner information with extraction metadata';
COMMENT ON COLUMN race_winners.race_id IS 'Foreign key to races table';
COMMENT ON COLUMN race_winners.winning_horse_number IS 'Horse number that won the race (1-16)';
COMMENT ON COLUMN race_winners.winning_payout_2_dollar IS '$2 payout amount for the winning horse';
COMMENT ON COLUMN race_winners.winning_payout_1_p3 IS '$1 P3 payout amount for the winning horse (optional)';
COMMENT ON COLUMN race_winners.extraction_method IS 'Method used to extract winner data';
COMMENT ON COLUMN race_winners.extraction_confidence IS 'Confidence level of the extraction method';
