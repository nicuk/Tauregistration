-- Check if there's a trigger that should be creating referral_stats records

-- 1. Check for triggers on the profiles table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM 
  information_schema.triggers
WHERE 
  event_object_table = 'profiles'
ORDER BY 
  trigger_name;

-- 2. Check for the initialize_referral_stats function
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc 
WHERE proname = 'initialize_referral_stats';

-- 3. Create the initialize_referral_stats function
CREATE OR REPLACE FUNCTION initialize_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a record already exists to prevent duplicates
  IF NOT EXISTS (SELECT 1 FROM referral_stats WHERE user_id = NEW.id) THEN
    -- Insert with explicit default values for all required fields
    INSERT INTO referral_stats (
      id,
      user_id,
      total_referrals,
      verified_referrals,
      active_referrals,
      unlocked_rewards,
      overall_completion_percentage,
      unlocked_percentage,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(), -- Generate a new UUID for the id
      NEW.id,            -- Use the profile id as user_id
      0,                 -- Initialize total_referrals to 0
      0,                 -- Initialize verified_referrals to 0
      0,                 -- Initialize active_referrals to 0
      0,                 -- Initialize unlocked_rewards to 0
      0.0,               -- Initialize overall_completion_percentage to 0
      0.0,               -- Initialize unlocked_percentage to 0
      NOW(),             -- Set created_at to current timestamp
      NOW()              -- Set updated_at to current timestamp
    );
    
    RAISE NOTICE 'Initialized referral stats for user %', NEW.id;
  ELSE
    RAISE NOTICE 'Referral stats already exist for user %', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in initialize_referral_stats: % %', SQLERRM, SQLSTATE;
    RETURN NEW; -- Continue with the transaction even if this fails
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS initialize_referral_stats_trigger ON profiles;

CREATE TRIGGER initialize_referral_stats_trigger
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION initialize_referral_stats();
