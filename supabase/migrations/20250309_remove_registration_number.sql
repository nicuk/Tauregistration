-- Migration to remove the redundant registration_number field
-- This migration simplifies the profile schema by relying solely on pioneer_number

-- First, create a function to generate formatted registration numbers on the fly
CREATE OR REPLACE FUNCTION get_formatted_pioneer_number(pioneer_num INTEGER) 
RETURNS TEXT AS $$
BEGIN
  RETURN 'TAU-' || LPAD(pioneer_num::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Update the create_user_profile_safe function to remove registration_number
CREATE OR REPLACE FUNCTION create_user_profile_safe(
    user_id UUID,
    user_username TEXT,
    user_is_pi BOOLEAN,
    user_pioneer_number INTEGER,
    user_is_genesis BOOLEAN
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Insert the profile without registration_number
    INSERT INTO profiles (
        id,
        username,
        is_pi_user,
        pioneer_number,
        is_genesis_pioneer,
        referral_code,
        email
    ) VALUES (
        user_id,
        user_username,
        user_is_pi,
        user_pioneer_number,
        user_is_genesis,
        generate_unique_referral_code(user_username),
        (SELECT email FROM auth.users WHERE id = user_id)
    )
    RETURNING jsonb_build_object(
        'id', id,
        'username', username,
        'is_pi_user', is_pi_user,
        'pioneer_number', pioneer_number,
        'is_genesis_pioneer', is_genesis_pioneer
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Error creating profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the create_complete_user_profile function to remove registration_number
CREATE OR REPLACE FUNCTION create_complete_user_profile(
    user_id UUID,
    user_username TEXT,
    user_is_pi BOOLEAN,
    user_referral_code TEXT,
    user_email TEXT,
    user_country TEXT,
    user_referral_source TEXT
) RETURNS JSONB AS $$
DECLARE
    pioneer_num INTEGER;
    is_genesis BOOLEAN;
    current_count INTEGER;
    result JSONB;
BEGIN
    -- Get the current count of pioneers
    SELECT total_pioneers INTO current_count FROM pioneer_stats_table WHERE id = 1;
    
    IF current_count IS NULL THEN
        current_count := 0;
    END IF;
    
    -- Increment the count
    current_count := current_count + 1;
    
    -- Set pioneer number if user is a Pi user
    IF user_is_pi THEN
        pioneer_num := current_count;
        
        -- Check if this is a genesis pioneer (first 10,000)
        is_genesis := (pioneer_num <= 10000);
    ELSE
        pioneer_num := NULL;
        is_genesis := FALSE;
    END IF;
    
    -- Insert the profile without registration_number
    INSERT INTO profiles (
        id,
        username,
        is_pi_user,
        pioneer_number,
        is_genesis_pioneer,
        referral_code,
        email,
        country,
        referral_source
    ) VALUES (
        user_id,
        user_username,
        user_is_pi,
        pioneer_num,
        is_genesis,
        COALESCE(user_referral_code, generate_unique_referral_code(user_username)),
        user_email,
        user_country,
        user_referral_source
    )
    RETURNING jsonb_build_object(
        'id', id,
        'username', username,
        'is_pi_user', is_pi_user,
        'pioneer_number', pioneer_number,
        'is_genesis_pioneer', is_genesis_pioneer
    ) INTO result;
    
    -- Update the pioneer stats
    UPDATE pioneer_stats_table 
    SET 
        total_pioneers = current_count,
        genesis_pioneers = CASE WHEN is_genesis THEN genesis_pioneers + 1 ELSE genesis_pioneers END,
        updated_at = NOW()
    WHERE id = 1;
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Error creating profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We're not dropping the registration_number column immediately to avoid breaking existing code
-- This can be done in a future migration after confirming all code has been updated
-- COMMENT ON COLUMN profiles.registration_number IS 'DEPRECATED: Use pioneer_number with get_formatted_pioneer_number() function instead';
