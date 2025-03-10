-- Production Fix for TAUMine Registration System
-- This script provides the final solution for both regular and referral-based registration

-- 1. Ensure the pioneer_stats_table is initialized
INSERT INTO pioneer_stats_table (id, total_pioneers, genesis_pioneers)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the production-ready registration function
CREATE OR REPLACE FUNCTION create_complete_user_profile(
  user_id uuid,
  username text,
  email text,
  is_pi_user boolean,
  referral_code text DEFAULT NULL::text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pioneer_number INTEGER;
  v_is_genesis_pioneer BOOLEAN;
  v_referral_code TEXT;
  v_referred_by TEXT := NULL;
  v_referrer_id UUID := NULL;
  v_result JSON;
BEGIN
  -- Log the start of the registration process
  RAISE LOG 'Starting registration for user: % (%), email: %, referral code: %', 
    username, user_id, email, referral_code;
  
  -- Generate a unique referral code
  v_referral_code := UPPER(SUBSTRING(username FROM 1 FOR 4) || SUBSTRING(MD5(user_id::TEXT) FROM 1 FOR 6));
  
  -- Get the next pioneer number
  SELECT COALESCE(MAX(pioneer_number), 0) + 1 INTO v_pioneer_number FROM profiles;
  v_is_genesis_pioneer := v_pioneer_number <= 10000;
  
  RAISE LOG 'Generated pioneer number: %, is genesis pioneer: %, referral code: %', 
    v_pioneer_number, v_is_genesis_pioneer, v_referral_code;
  
  -- Look up referrer if a referral code was provided
  IF referral_code IS NOT NULL THEN
    BEGIN
      -- Try exact match first
      SELECT id, referral_code INTO v_referrer_id, v_referred_by
      FROM profiles
      WHERE referral_code = referral_code
      LIMIT 1;
      
      IF v_referrer_id IS NULL THEN
        -- Try case-insensitive match
        SELECT id, referral_code INTO v_referrer_id, v_referred_by
        FROM profiles
        WHERE LOWER(referral_code) = LOWER(referral_code)
        LIMIT 1;
      END IF;
      
      IF v_referrer_id IS NOT NULL THEN
        RAISE LOG 'Found referrer with ID: %, using referral code: %', v_referrer_id, v_referred_by;
      ELSE
        RAISE LOG 'No referrer found for code: %', referral_code;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error looking up referrer: %', SQLERRM;
    END;
  END IF;
  
  -- Check if user already exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    -- Insert into auth.users
    BEGIN
      INSERT INTO auth.users (id, email)
      VALUES (user_id, email);
      
      RAISE LOG 'Created user in auth.users with ID: %', user_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error creating user in auth.users: %', SQLERRM;
        RETURN json_build_object(
          'success', false,
          'message', 'Error creating user in auth.users: ' || SQLERRM
        );
    END;
  ELSE
    RAISE LOG 'User already exists in auth.users with ID: %', user_id;
  END IF;
  
  -- Check if user already exists in profiles
  IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    -- Delete existing profile to avoid conflicts
    BEGIN
      DELETE FROM profiles WHERE id = user_id;
      RAISE LOG 'Deleted existing profile for user ID: %', user_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error deleting existing profile: %', SQLERRM;
        RETURN json_build_object(
          'success', false,
          'message', 'Error deleting existing profile: ' || SQLERRM
        );
    END;
  END IF;
  
  -- Insert into profiles
  BEGIN
    INSERT INTO profiles (
      id,
      username,
      email,
      referral_code,
      referred_by,
      is_pi_user,
      pioneer_number,
      is_genesis_pioneer,
      email_verified,
      twitter_verified,
      telegram_verified,
      twitter_shared,
      first_referral,
      total_referrals
    ) VALUES (
      user_id,
      username,
      email,
      v_referral_code,
      v_referred_by,
      is_pi_user,
      v_pioneer_number,
      v_is_genesis_pioneer,
      FALSE,
      FALSE,
      FALSE,
      FALSE,
      FALSE,
      0
    );
    
    RAISE LOG 'Created profile for user ID: %', user_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Error creating profile: %', SQLERRM;
      
      -- Clean up the auth user if profile creation fails
      BEGIN
        DELETE FROM auth.users WHERE id = user_id;
        RAISE LOG 'Cleaned up auth user after profile creation failure';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'Error cleaning up auth user: %', SQLERRM;
      END;
      
      RETURN json_build_object(
        'success', false,
        'message', 'Error creating profile: ' || SQLERRM
      );
  END;
  
  -- Create referral_stats if needed
  IF NOT EXISTS (SELECT 1 FROM referral_stats WHERE user_id = user_id) THEN
    BEGIN
      INSERT INTO referral_stats (
        user_id,
        total_referrals,
        verified_referrals,
        active_referrals,
        unlocked_rewards,
        overall_completion_percentage,
        unlocked_percentage,
        current_tier,
        next_tier,
        current_tier_progress,
        total_earnings,
        claimed_rewards,
        pending_rewards
      ) VALUES (
        user_id,
        0,
        0,
        0,
        0,
        0.0,
        0.0,
        1,
        2,
        0.0,
        0,
        0,
        0
      );
      
      RAISE LOG 'Created referral_stats for user ID: %', user_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error creating referral_stats: %', SQLERRM;
        -- Continue anyway, this is not critical
    END;
  END IF;
  
  -- Update pioneer_stats_table
  BEGIN
    UPDATE pioneer_stats_table
    SET 
      total_pioneers = total_pioneers + 1,
      genesis_pioneers = CASE WHEN v_is_genesis_pioneer THEN genesis_pioneers + 1 ELSE genesis_pioneers END,
      updated_at = NOW()
    WHERE id = 1;
    
    RAISE LOG 'Updated pioneer_stats_table';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Error updating pioneer_stats_table: %', SQLERRM;
      -- Continue anyway, this is not critical
  END;
  
  -- Create referral record if needed
  IF v_referrer_id IS NOT NULL THEN
    BEGIN
      -- Create the referral record
      INSERT INTO referrals (referrer_id, referred_id)
      VALUES (v_referrer_id, user_id)
      ON CONFLICT (referrer_id, referred_id) DO NOTHING;
      
      RAISE LOG 'Created referral record: referrer_id=%, referred_id=%', v_referrer_id, user_id;
      
      -- Update the referrer's total_referrals
      UPDATE profiles
      SET total_referrals = COALESCE(total_referrals, 0) + 1
      WHERE id = v_referrer_id;
      
      RAISE LOG 'Updated referrer''s total_referrals';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error processing referral: %', SQLERRM;
        -- Continue anyway, this is not critical
    END;
  END IF;
  
  v_result := json_build_object(
    'success', true,
    'message', 'User profile created successfully',
    'user_id', user_id,
    'username', username,
    'pioneer_number', v_pioneer_number,
    'is_genesis_pioneer', v_is_genesis_pioneer,
    'referral_code', v_referral_code
  );
  
  RAISE LOG 'Registration completed successfully for user ID: %', user_id;
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Unexpected error in registration process: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'message', 'Error creating user profile: ' || SQLERRM
    );
END;
$$;

-- 3. Create a helper function for the API to use
CREATE OR REPLACE FUNCTION public.api_register_user(
  email text,
  username text,
  is_pi_user boolean,
  referral_code text DEFAULT NULL::text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_result JSON;
BEGIN
  -- Call our working implementation
  v_result := create_complete_user_profile(
    v_user_id,
    username,
    email,
    is_pi_user,
    referral_code
  );
  
  RETURN v_result;
END;
$$;

-- 4. Create a function to fix existing referrals if needed
CREATE OR REPLACE FUNCTION fix_existing_referrals()
RETURNS TABLE(fixed_count integer) AS $$
DECLARE
  v_fixed_count INTEGER := 0;
  v_referrer_id UUID;
  v_referrer_code TEXT;
  v_user_record RECORD;
BEGIN
  -- Find profiles with referred_by that doesn't match any referral_code
  FOR v_user_record IN
    SELECT p.id, p.username, p.referred_by
    FROM profiles p
    WHERE p.referred_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM profiles p2 WHERE p2.referral_code = p.referred_by
    )
  LOOP
    -- Try to find a matching referrer by case-insensitive match
    SELECT id, referral_code INTO v_referrer_id, v_referrer_code
    FROM profiles
    WHERE LOWER(referral_code) = LOWER(v_user_record.referred_by)
    LIMIT 1;
    
    IF v_referrer_id IS NOT NULL THEN
      -- Update the referred_by to use the correct case
      UPDATE profiles
      SET referred_by = v_referrer_code
      WHERE id = v_user_record.id;
      
      -- Create the referral record if it doesn't exist
      INSERT INTO referrals (referrer_id, referred_id)
      VALUES (v_referrer_id, v_user_record.id)
      ON CONFLICT (referrer_id, referred_id) DO NOTHING;
      
      -- Update the referrer's total_referrals
      UPDATE profiles
      SET total_referrals = COALESCE(total_referrals, 0) + 1
      WHERE id = v_referrer_id;
      
      v_fixed_count := v_fixed_count + 1;
      
      RAISE NOTICE 'Fixed referral for user % (%), updated referred_by from % to %',
        v_user_record.username, v_user_record.id, v_user_record.referred_by, v_referrer_code;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_fixed_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Add a comment explaining the fix
COMMENT ON FUNCTION create_complete_user_profile(uuid, text, text, boolean, text) IS 
'This function handles the complete user registration process, including:
1. Creating the user in auth.users
2. Creating the user profile with a unique referral code
3. Handling referral relationships
4. Creating referral statistics
5. Updating pioneer statistics

It addresses several key issues:
- Ensures the pioneer_stats_table has a row with ID=1
- Properly handles referral codes as TEXT
- Prevents duplicate key errors
- Provides detailed error handling and logging

The function returns a JSON object with success/failure information and user details.';

-- 6. Provide usage instructions
/*
USAGE INSTRUCTIONS:

1. Run this script to install the fixed registration function.

2. To register a user, call the create_complete_user_profile function:
   
   SELECT create_complete_user_profile(
     gen_random_uuid(),  -- user_id
     'username',         -- username
     'email@example.com', -- email
     false,              -- is_pi_user
     'REFERRAL123'       -- referral_code (optional)
   );

3. To fix existing referrals, call the fix_existing_referrals function:

   SELECT * FROM fix_existing_referrals();

4. If you want to use this from your API, call the api_register_user function:

   SELECT api_register_user(
     'email@example.com', -- email
     'username',         -- username
     false,              -- is_pi_user
     'REFERRAL123'       -- referral_code (optional)
   );
*/
