-- Update the assign_pioneer_number function to handle the total_registrations column
-- This doesn't replace the existing function, just updates it to track total registrations

CREATE OR REPLACE FUNCTION public.assign_pioneer_number()
RETURNS TRIGGER AS $$
DECLARE
    v_pioneer_number INTEGER;
    v_max_number INTEGER;
BEGIN
    -- First try to find gaps below 10000 using EXCEPT approach
    WITH available_numbers AS (
        SELECT generate_series(1, 10000) AS num
        EXCEPT
        SELECT pioneer_number FROM public.profiles WHERE pioneer_number IS NOT NULL
        ORDER BY num
        LIMIT 1
    )
    SELECT num INTO v_pioneer_number
    FROM available_numbers;
    
    -- If no gaps found below 10000, get the next number after the maximum
    IF v_pioneer_number IS NULL THEN
        SELECT COALESCE(MAX(pioneer_number), 10000) INTO v_max_number
        FROM public.profiles
        WHERE pioneer_number IS NOT NULL;
        
        v_pioneer_number := v_max_number + 1;
    END IF;
    
    -- Set the pioneer number and is_genesis_pioneer flag
    NEW.pioneer_number := v_pioneer_number;
    NEW.is_genesis_pioneer := (v_pioneer_number <= 10000);
    
    -- Update the pioneer stats table, including total_registrations
    UPDATE public.pioneer_stats_table
    SET 
        genesis_pioneers = CASE 
                            WHEN v_pioneer_number <= 10000 THEN genesis_pioneers + 1
                            ELSE genesis_pioneers
                          END,
        total_registrations = COALESCE(total_registrations, 0) + 1,
        updated_at = NOW()
    WHERE id = 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
