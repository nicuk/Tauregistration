-- Update pioneer_stats_table to showcase we've exceeded 10,000 registrations

-- First, check the current structure of the pioneer_stats_table
SELECT * FROM pioneer_stats_table;

-- Add a new column to track total registrations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'pioneer_stats_table'
                  AND column_name = 'total_registrations') THEN
        ALTER TABLE public.pioneer_stats_table ADD COLUMN total_registrations INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update the total_registrations to reflect the actual count
UPDATE public.pioneer_stats_table
SET 
    total_registrations = (SELECT COUNT(*)::INTEGER FROM profiles),
    updated_at = NOW()
WHERE id = 1;

-- Create a new function to get extended pioneer stats that includes total registrations
CREATE OR REPLACE FUNCTION public.get_extended_pioneer_stats()
RETURNS TABLE (
    genesis_pioneers INTEGER,
    total_pioneers INTEGER,
    genesis_slots_filled INTEGER,
    total_registrations INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.genesis_pioneers,
        (SELECT COUNT(*)::INTEGER FROM profiles),
        LEAST(ps.genesis_pioneers, 10000)::INTEGER AS genesis_slots_filled,
        ps.total_registrations
    FROM 
        public.pioneer_stats_table ps
    WHERE 
        ps.id = 1;
END;
$$;

-- Test the function
SELECT * FROM public.get_extended_pioneer_stats();

-- Create a function to get a formatted message about pioneer status
CREATE OR REPLACE FUNCTION public.get_pioneer_status_message()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    stats RECORD;
    message TEXT;
BEGIN
    SELECT * INTO stats FROM public.get_extended_pioneer_stats();
    
    IF stats.genesis_slots_filled = 10000 THEN
        -- All Genesis Pioneer slots are filled
        message := '10,000/10,000 Genesis Pioneers! ' || 
                  (stats.total_registrations - 10000)::TEXT || 
                  ' additional pioneers have joined since!';
    ELSE
        -- Some Genesis Pioneer slots still available
        message := stats.genesis_slots_filled::TEXT || '/10,000 Genesis Pioneers';
    END IF;
    
    RETURN message;
END;
$$;

-- Test the message function
SELECT public.get_pioneer_status_message();
