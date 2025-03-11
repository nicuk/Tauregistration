-- Diagnose and fix referral system issues

-- 1. First, examine the structure of the referrals table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'referrals'
ORDER BY 
    ordinal_position;

-- 2. Check the structure of the profiles table, focusing on the referred_by field
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'referred_by';

-- 3. Check for profiles with referral codes that aren't properly linked
SELECT 
    p.id,
    p.username,
    p.referral_code,
    p.referred_by,
    p.total_referrals,
    (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = p.id) AS actual_referrals
FROM 
    profiles p
WHERE 
    p.referred_by IS NOT NULL
ORDER BY 
    p.id;

-- 4. Check for missing referral records
WITH profile_referrals AS (
    SELECT 
        p.id,
        p.username,
        p.referred_by,
        (SELECT username FROM profiles WHERE referral_code = p.referred_by) AS referrer_username,
        (SELECT id FROM profiles WHERE referral_code = p.referred_by) AS referrer_id
    FROM 
        profiles p
    WHERE 
        p.referred_by IS NOT NULL
)
SELECT 
    pr.id,
    pr.username,
    pr.referred_by,
    pr.referrer_username,
    pr.referrer_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM referrals r WHERE r.referred_id = pr.id AND r.referrer_id = pr.referrer_id) 
        THEN 'Yes' 
        ELSE 'No' 
    END AS referral_record_exists
FROM 
    profile_referrals pr
WHERE 
    pr.referrer_id IS NOT NULL;

-- 5. Fix missing referral records
-- This will insert referral records for profiles that have a referred_by value
-- but don't have a corresponding record in the referrals table
INSERT INTO referrals (referrer_id, referred_id, created_at)
SELECT 
    referrer.id AS referrer_id,
    referred.id AS referred_id,
    CURRENT_TIMESTAMP AS created_at
FROM 
    profiles referred
JOIN 
    profiles referrer ON referrer.referral_code = referred.referred_by
WHERE 
    referred.referred_by IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM referrals r 
        WHERE r.referrer_id = referrer.id AND r.referred_id = referred.id
    );

-- 6. Update total_referrals count for each user
UPDATE profiles p
SET total_referrals = (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = p.id)
WHERE EXISTS (SELECT 1 FROM referrals r WHERE r.referrer_id = p.id);

-- 7. Check for any referrals that don't have corresponding profiles
SELECT 
    r.referrer_id,
    r.referred_id,
    r.created_at,
    (SELECT username FROM profiles WHERE id = r.referrer_id) AS referrer_username,
    (SELECT username FROM profiles WHERE id = r.referred_id) AS referred_username
FROM 
    referrals r
WHERE 
    NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = r.referrer_id)
    OR NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = r.referred_id);

-- 8. Verify the fix by checking the counts
SELECT 
    p.id,
    p.username,
    p.referral_code,
    p.total_referrals,
    (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = p.id) AS actual_referrals
FROM 
    profiles p
WHERE 
    p.total_referrals > 0 OR EXISTS (SELECT 1 FROM referrals r WHERE r.referrer_id = p.id)
ORDER BY 
    actual_referrals DESC;
