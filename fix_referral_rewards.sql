-- Fix referral rewards calculation to ensure consistency between frontend and database
-- This script recalculates referral rewards based on the verification steps completed by referrals

-- First, create a temporary table to store the recalculated rewards
CREATE TEMP TABLE temp_referral_rewards AS
WITH referral_calculations AS (
    SELECT 
        p.referred_by,
        SUM(
            CASE WHEN p.email_verified THEN 1000 ELSE 0 END +
            CASE WHEN p.twitter_verified THEN 1000 ELSE 0 END +
            CASE WHEN p.telegram_verified THEN 1000 ELSE 0 END +
            CASE WHEN p.twitter_shared THEN 1000 ELSE 0 END +
            CASE WHEN p.first_referral THEN 1000 ELSE 0 END
        ) AS calculated_rewards,
        COUNT(*) FILTER (WHERE 
            p.email_verified AND 
            p.twitter_verified AND 
            p.telegram_verified AND 
            p.twitter_shared AND 
            p.first_referral
        ) AS fully_verified_referrals
    FROM 
        profiles p
    WHERE 
        p.referred_by IS NOT NULL
    GROUP BY 
        p.referred_by
)
SELECT 
    p.id AS user_id,
    p.referral_code,
    COALESCE(rc.calculated_rewards, 0) AS referral_rewards,
    COALESCE(rc.fully_verified_referrals, 0) AS verified_referrals,
    CASE 
        WHEN COALESCE(rc.fully_verified_referrals, 0) >= 100 THEN 500000 -- Tier 7
        WHEN COALESCE(rc.fully_verified_referrals, 0) >= 50 THEN 250000  -- Tier 6
        WHEN COALESCE(rc.fully_verified_referrals, 0) >= 25 THEN 125000  -- Tier 5
        WHEN COALESCE(rc.fully_verified_referrals, 0) >= 12 THEN 50000   -- Tier 4
        WHEN COALESCE(rc.fully_verified_referrals, 0) >= 6 THEN 22500    -- Tier 3
        WHEN COALESCE(rc.fully_verified_referrals, 0) >= 3 THEN 12500    -- Tier 2
        WHEN COALESCE(rc.fully_verified_referrals, 0) >= 1 THEN 5000     -- Tier 1
        ELSE 0
    END AS milestone_rewards
FROM 
    profiles p
LEFT JOIN 
    referral_calculations rc ON p.referral_code = rc.referred_by;

-- Update the referral_stats table with the recalculated values
UPDATE referral_stats rs
SET 
    referral_rewards = tr.referral_rewards,
    verified_referrals = tr.verified_referrals,
    milestone_rewards = tr.milestone_rewards,
    total_earnings = tr.referral_rewards + tr.milestone_rewards,
    pending_rewards = (
        -- Calculate potential rewards from incomplete referrals
        SELECT COALESCE(SUM(
            (5 - (
                CASE WHEN p.email_verified THEN 1 ELSE 0 END +
                CASE WHEN p.twitter_verified THEN 1 ELSE 0 END +
                CASE WHEN p.telegram_verified THEN 1 ELSE 0 END +
                CASE WHEN p.twitter_shared THEN 1 ELSE 0 END +
                CASE WHEN p.first_referral THEN 1 ELSE 0 END
            )) * 1000
        ), 0)
        FROM profiles p
        WHERE p.referred_by = (
            SELECT referral_code FROM profiles WHERE id = rs.user_id
        )
    )
FROM 
    temp_referral_rewards tr
WHERE 
    rs.user_id = tr.user_id;

-- Drop the temporary table
DROP TABLE temp_referral_rewards;

-- Output the updated values for verification
SELECT 
    p.username,
    rs.referral_rewards,
    rs.verified_referrals,
    rs.milestone_rewards,
    rs.total_earnings,
    rs.pending_rewards
FROM 
    referral_stats rs
JOIN 
    profiles p ON rs.user_id = p.id
ORDER BY 
    rs.total_earnings DESC;
