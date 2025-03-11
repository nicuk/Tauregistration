-- SQL Script to reset all test data in the TAUMine database
-- This script resets referral statistics, verification status, and other test data
-- while maintaining the core database structure

-- 1. Reset referral_stats table
UPDATE referral_stats
SET 
  total_referrals = 0,
  verified_referrals = 0,
  active_referrals = 0,
  rank = 0,
  total_earnings = 0,
  claimed_rewards = 0,
  pending_rewards = 0,
  unlocked_rewards = 0,
  current_tier = 0,
  next_tier = 1,
  current_tier_progress = 0,
  current_tier_name = '',
  next_tier_name = '',
  overall_completion_percentage = 0,
  unlocked_percentage = 0,
  progress_to_next_tier = 0,
  referrals_needed = 1;

-- 2. Reset verification status in profiles table
UPDATE profiles
SET 
  twitter_verified = false,
  telegram_verified = false,
  twitter_shared = false,
  first_referral = false,
  total_referrals = 0,
  referred_by = null;

-- 3. Reset pioneer_stats_table
-- Ensure the row with ID=1 exists and reset its values
INSERT INTO pioneer_stats_table (id, total_pioneers)
VALUES (1, 0)
ON CONFLICT (id) 
DO UPDATE SET total_pioneers = 0;

-- 4. Reset any other tables that store referral or verification data
-- If there are any additional tables related to referrals or verification, add them here

-- 5. Optionally, you can delete test users if needed
-- WARNING: This will delete actual user accounts. Uncomment only if you're sure.
-- DELETE FROM auth.users WHERE email LIKE '%test%';
-- DELETE FROM profiles WHERE username LIKE '%test%';

-- 6. Reset any triggers or sequences if needed
-- For example, if you have a sequence for user IDs, you might want to reset it

-- 7. Verify the reset was successful
-- These SELECT statements will show you the current state after reset
SELECT COUNT(*) as total_profiles FROM profiles;
SELECT COUNT(*) as total_referral_stats FROM referral_stats;
SELECT * FROM pioneer_stats_table;

-- Note: This script maintains the database structure and only resets the data
-- It does not drop tables or alter the schema in any way
