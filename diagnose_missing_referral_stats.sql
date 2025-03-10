-- Script to diagnose why referral_stats records aren't being created
-- This will check for existing users that don't have referral_stats records

-- 1. Find users who have profiles but no referral_stats
SELECT 
  p.id,
  p.username,
  p.email,
  p.referred_by,
  p.created_at
FROM 
  profiles p
LEFT JOIN 
  referral_stats rs ON p.id = rs.user_id
WHERE 
  rs.id IS NULL
LIMIT 10;

-- 2. Count how many users are missing referral_stats
SELECT 
  COUNT(*)
FROM 
  profiles p
LEFT JOIN 
  referral_stats rs ON p.id = rs.user_id
WHERE 
  rs.id IS NULL;

-- 3. Check if the trigger is enabled
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_orientation,
  action_timing,
  action_condition,
  action_reference_old_table,
  action_reference_new_table
FROM 
  information_schema.triggers
WHERE 
  event_object_table = 'profiles'
  AND trigger_name = 'initialize_referral_stats_trigger';

-- 4. Fix missing referral_stats for existing users
DO $$
DECLARE
  missing_user RECORD;
  counter INT := 0;
BEGIN
  FOR missing_user IN
    SELECT 
      p.id,
      p.username
    FROM 
      profiles p
    LEFT JOIN 
      referral_stats rs ON p.id = rs.user_id
    WHERE 
      rs.id IS NULL
  LOOP
    -- Create referral_stats record for this user
    BEGIN
      INSERT INTO referral_stats (
        id,
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
        pending_rewards,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        missing_user.id,
        0, -- total_referrals
        0, -- verified_referrals
        0, -- active_referrals
        0, -- unlocked_rewards
        0.0, -- overall_completion_percentage
        0.0, -- unlocked_percentage
        1, -- current_tier
        2, -- next_tier
        0.0, -- current_tier_progress
        0, -- total_earnings
        0, -- claimed_rewards
        0, -- pending_rewards
        NOW(), -- created_at
        NOW() -- updated_at
      );
      
      counter := counter + 1;
      
      IF counter % 100 = 0 THEN
        RAISE NOTICE 'Processed % users', counter;
      END IF;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'User % already has a referral_stats record (created concurrently)', missing_user.id;
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating referral_stats for user %: % %', missing_user.id, SQLERRM, SQLSTATE;
    END;
  END LOOP;
  
  RAISE NOTICE 'Created referral_stats records for % users', counter;
END $$;
