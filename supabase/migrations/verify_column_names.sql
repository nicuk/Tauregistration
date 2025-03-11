-- Verify column names and structure for the profiles table
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
ORDER BY 
    ordinal_position;

-- Verify column names and structure for the referrals table
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

-- Test a query to find a profile by referral_code (without the profiles. prefix)
SELECT 
    id, 
    username, 
    referral_code, 
    referred_by
FROM 
    profiles
WHERE 
    referral_code = 'TAU4TKFT9AR'
LIMIT 1;

-- Test a case-insensitive query to find a profile by referral_code
SELECT 
    id, 
    username, 
    referral_code, 
    referred_by
FROM 
    profiles
WHERE 
    referral_code ILIKE 'tau4tkft9ar'
LIMIT 1;

-- Check for any existing referral relationships
SELECT 
    p.id AS user_id,
    p.username,
    p.referral_code,
    p.referred_by,
    ref.referrer_id,
    ref.referred_id,
    ref.created_at AS referral_date,
    (SELECT username FROM profiles WHERE id = ref.referrer_id) AS referrer_username
FROM 
    profiles p
LEFT JOIN 
    referrals ref ON p.id = ref.referred_id
WHERE 
    p.referred_by IS NOT NULL
    OR ref.referred_id IS NOT NULL
LIMIT 10;
