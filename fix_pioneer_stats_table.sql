-- Fix the pioneer_stats_table by creating a row with ID=1
-- This should be run once to initialize the table

-- First, check if a row already exists
SELECT * FROM pioneer_stats_table;

-- If no rows exist, create one with ID=1
INSERT INTO pioneer_stats_table (id, total_pioneers, genesis_pioneers, updated_at)
VALUES (1, 0, 0, now())
ON CONFLICT (id) DO NOTHING;

-- Verify the row was created
SELECT * FROM pioneer_stats_table;
