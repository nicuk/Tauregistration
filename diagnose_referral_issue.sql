-- Diagnose the referral registration issue

-- 1. Check the structure of the profiles table, focusing on the referred_by column
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'referred_by';

-- 2. Check if there are any constraints on the referred_by column
SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'profiles'
  AND kcu.column_name = 'referred_by';

-- 3. Check for any foreign key relationships on the referred_by column
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name = 'profiles'
  AND kcu.column_name = 'referred_by';

-- 4. Check the existing values in the referred_by column
SELECT id, username, referred_by
FROM profiles
WHERE referred_by IS NOT NULL
LIMIT 10;

-- 5. Check for any triggers on the profiles table that might affect referred_by
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'profiles'
  AND action_statement LIKE '%referred_by%';

-- 6. Try a test update to see if we can update the referred_by field directly
-- DO $$
-- BEGIN
--   UPDATE profiles
--   SET referred_by = 'TEST123456'
--   WHERE id = 'some-test-id-here'
--   AND referred_by IS NULL;
--   
--   RAISE NOTICE 'Update completed';
-- EXCEPTION WHEN OTHERS THEN
--   RAISE NOTICE 'Error updating referred_by: %', SQLERRM;
-- END
-- $$;

-- 7. Check if the referral_stats table exists and has the correct structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'referral_stats'
ORDER BY ordinal_position;

-- 8. Check if the pioneer_stats_table is properly initialized
SELECT * FROM pioneer_stats_table;

-- 9. Check the relationship between profiles and referrals tables
SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND (tc.table_name = 'referrals' OR ccu.table_name = 'referrals');

-- 10. Check the structure of the referrals table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'referrals'
ORDER BY ordinal_position;
