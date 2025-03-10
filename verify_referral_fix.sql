-- Verify that the referral registration fix is working correctly

-- 1. Check profiles with referral codes
SELECT id, username, referral_code, referred_by
FROM profiles
WHERE referred_by IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if the referred_by field contains referral codes (not UUIDs)
SELECT 
    p.id,
    p.username,
    p.referred_by,
    r.referral_code AS referrer_code,
    r.username AS referrer_username
FROM 
    profiles p
LEFT JOIN 
    profiles r ON p.referred_by = r.referral_code
WHERE 
    p.referred_by IS NOT NULL
ORDER BY 
    p.created_at DESC
LIMIT 10;

-- 3. Check if entries in the referrals table match the referred_by relationships
SELECT 
    r.referrer_id,
    p_referrer.username AS referrer_username,
    p_referrer.referral_code,
    r.referred_id,
    p_referred.username AS referred_username,
    p_referred.referred_by
FROM 
    referrals r
JOIN 
    profiles p_referrer ON r.referrer_id = p_referrer.id
JOIN 
    profiles p_referred ON r.referred_id = p_referred.id
ORDER BY 
    r.created_at DESC
LIMIT 10;

-- 4. Check for inconsistencies between profiles and referrals tables
SELECT 
    p.id,
    p.username,
    p.referred_by,
    r.referrer_id,
    ref_profile.referral_code
FROM 
    profiles p
LEFT JOIN 
    referrals r ON p.id = r.referred_id
LEFT JOIN
    profiles ref_profile ON r.referrer_id = ref_profile.id
WHERE 
    p.referred_by IS NOT NULL
    AND (r.referrer_id IS NULL OR p.referred_by != ref_profile.referral_code)
ORDER BY 
    p.created_at DESC
LIMIT 10;

-- 5. Check if total_referrals counts are accurate
SELECT 
    p.id,
    p.username,
    p.referral_code,
    p.total_referrals,
    COUNT(r.referred_id) AS actual_referral_count
FROM 
    profiles p
LEFT JOIN 
    referrals r ON p.id = r.referrer_id
GROUP BY 
    p.id, p.username, p.referral_code, p.total_referrals
HAVING 
    p.total_referrals != COUNT(r.referred_id)
ORDER BY 
    p.total_referrals DESC
LIMIT 10;

-- 6. Check if the referral_stats table is being updated correctly
SELECT 
    rs.user_id,
    p.username,
    p.referral_code,
    rs.total_referrals,
    COUNT(r.referred_id) AS actual_referral_count,
    rs.verified_referrals,
    rs.active_referrals,
    rs.unlocked_rewards
FROM 
    referral_stats rs
JOIN 
    profiles p ON rs.user_id = p.id
LEFT JOIN 
    referrals r ON p.id = r.referrer_id
GROUP BY 
    rs.user_id, p.username, p.referral_code, rs.total_referrals, rs.verified_referrals, rs.active_referrals, rs.unlocked_rewards
ORDER BY 
    rs.total_referrals DESC
LIMIT 10;

-- 7. Check for any orphaned referrals (referrals without matching profiles)
SELECT 
    r.referrer_id,
    r.referred_id,
    p_referrer.username AS referrer_username,
    p_referred.username AS referred_username
FROM 
    referrals r
LEFT JOIN 
    profiles p_referrer ON r.referrer_id = p_referrer.id
LEFT JOIN 
    profiles p_referred ON r.referred_id = p_referred.id
WHERE 
    p_referrer.id IS NULL OR p_referred.id IS NULL
LIMIT 10;

-- 8. Check the most recent registrations to verify the fix is working
SELECT 
    p.id,
    p.username,
    p.referral_code,
    p.referred_by,
    p.created_at,
    r.referrer_id,
    ref_profile.username AS referrer_username
FROM 
    profiles p
LEFT JOIN 
    referrals r ON p.id = r.referred_id
LEFT JOIN
    profiles ref_profile ON r.referrer_id = ref_profile.id
ORDER BY 
    p.created_at DESC
LIMIT 10;
