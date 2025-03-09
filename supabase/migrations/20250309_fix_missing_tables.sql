-- Create pioneer_stats_table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pioneer_stats_table (
    id INTEGER PRIMARY KEY,
    total_pioneers INTEGER DEFAULT 0,
    genesis_pioneers INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Insert initial record
INSERT INTO public.pioneer_stats_table (id, total_pioneers, genesis_pioneers)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL ON public.pioneer_stats_table TO authenticated;
GRANT ALL ON public.pioneer_stats_table TO service_role;

-- Ensure profiles table has all required fields
DO $$ 
BEGIN
    -- Check if registration_number column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'registration_number'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN registration_number TEXT;
    END IF;

    -- Check if pioneer_number column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'pioneer_number'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN pioneer_number INTEGER;
    END IF;

    -- Check if is_genesis_pioneer column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_genesis_pioneer'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_genesis_pioneer BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create a sequence for pioneer numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS pioneer_number_seq START 1;

-- Create or replace the complete user profile function
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
    reg_number TEXT;
    pioneer_num INTEGER;
    is_genesis BOOLEAN;
    current_count INTEGER;
BEGIN
    -- Get the current count of pioneers
    SELECT total_pioneers INTO current_count FROM pioneer_stats_table WHERE id = 1;
    
    IF current_count IS NULL THEN
        current_count := 0;
    END IF;
    
    -- Increment the count
    current_count := current_count + 1;
    
    -- Format the registration number
    reg_number := 'TAU-' || LPAD(current_count::TEXT, 8, '0');
    
    -- Set pioneer number if user is a Pi user
    IF user_is_pi THEN
        pioneer_num := current_count;
        
        -- Check if this is a genesis pioneer (first 100)
        is_genesis := (pioneer_num <= 100);
    ELSE
        pioneer_num := NULL;
        is_genesis := FALSE;
    END IF;
    
    -- Insert the profile
    INSERT INTO profiles (
        id,
        username,
        is_pi_user,
        registration_number,
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
        reg_number,
        pioneer_num,
        is_genesis,
        user_referral_code,
        user_email,
        user_country,
        user_referral_source
    );
    
    -- Update pioneer stats
    IF user_is_pi THEN
        UPDATE pioneer_stats_table 
        SET 
            total_pioneers = current_count,
            genesis_pioneers = CASE WHEN is_genesis THEN genesis_pioneers + 1 ELSE genesis_pioneers END,
            updated_at = NOW()
        WHERE id = 1;
    END IF;
    
    -- Return the created profile data
    RETURN jsonb_build_object(
        'registration_number', reg_number,
        'pioneer_number', pioneer_num,
        'is_genesis_pioneer', is_genesis
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_complete_user_profile TO service_role;
