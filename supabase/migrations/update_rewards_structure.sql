-- Update the referral_stats table to support the new reward structure
-- This migration adds or modifies columns to track referral rewards, milestone rewards, and pending rewards

BEGIN;

-- First, check if the columns already exist
DO $$
BEGIN
    -- Add referral_rewards column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'referral_stats'
                  AND column_name = 'referral_rewards') THEN
        ALTER TABLE public.referral_stats ADD COLUMN referral_rewards BIGINT DEFAULT 0;
    END IF;

    -- Add milestone_rewards column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'referral_stats'
                  AND column_name = 'milestone_rewards') THEN
        ALTER TABLE public.referral_stats ADD COLUMN milestone_rewards BIGINT DEFAULT 0;
    END IF;

    -- Add pending_rewards column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'referral_stats'
                  AND column_name = 'pending_rewards') THEN
        ALTER TABLE public.referral_stats ADD COLUMN pending_rewards BIGINT DEFAULT 0;
    END IF;

    -- Ensure total_earnings column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'referral_stats'
                  AND column_name = 'total_earnings') THEN
        ALTER TABLE public.referral_stats ADD COLUMN total_earnings BIGINT DEFAULT 0;
    END IF;
END
$$;

-- Create or replace the function to update referral stats
CREATE OR REPLACE FUNCTION update_referral_stats() 
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_referral_rewards BIGINT := 0;
    v_milestone_rewards BIGINT := 0;
    v_pending_rewards BIGINT := 0;
    v_total_earnings BIGINT := 0;
    v_referral RECORD;
    v_completed_steps INT;
    v_is_fully_verified BOOLEAN;
    v_fully_verified_count INT := 0;
    v_tier RECORD;
BEGIN
    -- Get the referrer's ID
    SELECT id INTO v_referrer_id FROM public.profiles 
    WHERE referral_code = NEW.referred_by;
    
    IF v_referrer_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Calculate rewards for all referrals of this referrer
    FOR v_referral IN 
        SELECT 
            email IS NOT NULL AS email_verified,
            twitter_verified,
            telegram_verified,
            twitter_shared,
            first_referral
        FROM public.profiles
        WHERE referred_by = (SELECT referral_code FROM public.profiles WHERE id = v_referrer_id)
    LOOP
        -- Count completed verification steps
        v_completed_steps := 0;
        IF v_referral.email_verified THEN v_completed_steps := v_completed_steps + 1; END IF;
        IF v_referral.twitter_verified THEN v_completed_steps := v_completed_steps + 1; END IF;
        IF v_referral.telegram_verified THEN v_completed_steps := v_completed_steps + 1; END IF;
        IF v_referral.twitter_shared THEN v_completed_steps := v_completed_steps + 1; END IF;
        IF v_referral.first_referral THEN v_completed_steps := v_completed_steps + 1; END IF;
        
        -- Check if fully verified
        v_is_fully_verified := v_completed_steps = 5;
        
        -- Calculate rewards
        IF v_is_fully_verified THEN
            -- Count fully verified referrals for milestone rewards
            v_fully_verified_count := v_fully_verified_count + 1;
        ELSE
            -- Partially verified referral contributes to referral rewards
            v_referral_rewards := v_referral_rewards + (v_completed_steps * 2000);
        END IF;
        
        -- Calculate pending rewards
        v_pending_rewards := v_pending_rewards + ((5 - v_completed_steps) * 2000);
    END LOOP;
    
    -- Calculate milestone rewards based on tiers
    v_milestone_rewards := 0;
    
    -- Define milestone tiers
    FOR v_tier IN (
        SELECT * FROM (VALUES
            (1, 10000, 1),
            (2, 25000, 3),
            (3, 45000, 6),
            (4, 100000, 12),
            (5, 250000, 25),
            (6, 500000, 50),
            (7, 1000000, 100)
        ) AS t(tier, reward, required)
        ORDER BY tier
    )
    LOOP
        -- Check if the user has enough fully verified referrals for this tier
        IF v_fully_verified_count >= v_tier.required THEN
            v_milestone_rewards := v_tier.reward;
        ELSE
            -- Stop checking higher tiers if the current one isn't met
            EXIT;
        END IF;
    END LOOP;
    
    -- Calculate total earnings (referral + milestone rewards only)
    v_total_earnings := v_referral_rewards + v_milestone_rewards;
    
    -- Update the referral_stats table
    UPDATE public.referral_stats
    SET 
        referral_rewards = v_referral_rewards,
        milestone_rewards = v_milestone_rewards,
        pending_rewards = v_pending_rewards,
        total_earnings = v_total_earnings,
        updated_at = NOW()
    WHERE user_id = v_referrer_id;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO public.referral_stats (
            user_id, 
            referral_rewards, 
            milestone_rewards, 
            pending_rewards, 
            total_earnings,
            created_at,
            updated_at
        ) VALUES (
            v_referrer_id, 
            v_referral_rewards, 
            v_milestone_rewards, 
            v_pending_rewards, 
            v_total_earnings,
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        INSERT INTO public.registration_error_log (
            step,
            error_message,
            error_state,
            user_data
        )
        VALUES (
            'update_referral_stats',
            'Error in update_referral_stats function: ' || SQLERRM,
            SQLSTATE,
            jsonb_build_object('user_id', NEW.id, 'referrer_id', v_referrer_id)
        );
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the existing progressive rewards trigger
DROP TRIGGER IF EXISTS update_progressive_rewards_trigger ON public.profiles;

-- Create the referral stats trigger
DROP TRIGGER IF EXISTS update_referral_stats_trigger ON public.profiles;
CREATE TRIGGER update_referral_stats_trigger
AFTER INSERT OR UPDATE OF twitter_verified, telegram_verified, twitter_shared, first_referral
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_referral_stats();

-- Run an initial update to populate the new columns for all existing users
DO $$
DECLARE
    v_referrer RECORD;
BEGIN
    -- Update referral rewards for all referrers
    FOR v_referrer IN SELECT DISTINCT referred_by FROM public.profiles WHERE referred_by IS NOT NULL
    LOOP
        -- Trigger an update on a referral to recalculate stats for the referrer
        UPDATE public.profiles
        SET updated_at = NOW()
        WHERE referral_code = v_referrer.referred_by;
    END LOOP;
END
$$;

COMMIT;
