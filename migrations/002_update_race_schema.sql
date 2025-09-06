-- Migration: Update race schema for new data format
-- Description: Updates the races and race_entries tables to match the new data structure from Google Sheets

-- Add post_time column to races table
ALTER TABLE races ADD COLUMN IF NOT EXISTS post_time TIME;

-- Remove previous race winner columns from races table
ALTER TABLE races DROP COLUMN IF EXISTS prev_race_1_winner_horse_number;
ALTER TABLE races DROP COLUMN IF EXISTS prev_race_1_winner_payout;
ALTER TABLE races DROP COLUMN IF EXISTS prev_race_2_winner_horse_number;
ALTER TABLE races DROP COLUMN IF EXISTS prev_race_2_winner_payout;

-- Update race number constraint to allow 1-15 instead of 3-15
ALTER TABLE races DROP CONSTRAINT IF EXISTS race_number_valid;
ALTER TABLE races ADD CONSTRAINT race_number_valid CHECK (race_number >= 1 AND race_number <= 15);

-- Add new columns to race_entries table
ALTER TABLE race_entries ADD COLUMN IF NOT EXISTS correct_p3 NUMERIC(10,2);
ALTER TABLE race_entries ADD COLUMN IF NOT EXISTS will_pay VARCHAR(50);

-- Change p3 column from NUMERIC to VARCHAR to handle 'FALSE' values
ALTER TABLE race_entries ALTER COLUMN p3 TYPE VARCHAR(20);

-- Update horse number constraint to allow 1-16 (already correct)
-- Update indexes if needed
CREATE INDEX IF NOT EXISTS idx_races_post_time ON races(post_time);
CREATE INDEX IF NOT EXISTS idx_race_entries_correct_p3 ON race_entries(correct_p3);
CREATE INDEX IF NOT EXISTS idx_race_entries_will_pay ON race_entries(will_pay);

-- Update comments for clarity
COMMENT ON COLUMN races.post_time IS 'Race post time (e.g., 1:13:00 PM)';
COMMENT ON COLUMN race_entries.correct_p3 IS 'Correct P3 value (numeric)';
COMMENT ON COLUMN race_entries.will_pay IS 'Will Pay amount (e.g., $264.59)';
COMMENT ON COLUMN race_entries.p3 IS 'Pick 3 value (string, can be FALSE or null)';
