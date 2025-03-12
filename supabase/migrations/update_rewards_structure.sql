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

    -- Add verified_referrals column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'referral_stats'
                  AND column_name = 'verified_referrals') THEN
        ALTER TABLE public.referral_stats ADD COLUMN verified_referrals INT DEFAULT 0;
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
        
        -- Calculate referral rewards - each step is worth 1000 TAU
        v_referral_rewards := v_referral_rewards + (v_completed_steps * 1000);
        
        -- Track fully verified referrals for milestone rewards
        IF v_is_fully_verified THEN
            v_fully_verified_count := v_fully_verified_count + 1;
        END IF;
        
        -- Calculate pending rewards - remaining steps are worth 1000 TAU each
        v_pending_rewards := v_pending_rewards + ((5 - v_completed_steps) * 1000);
    END LOOP;
    
    -- Calculate milestone rewards based on tiers
    v_milestone_rewards := 0;
    
    -- Define milestone tiers and find the highest tier achieved
    IF v_fully_verified_count >= 100 THEN
        v_milestone_rewards := 500000;
    ELSIF v_fully_verified_count >= 50 THEN
        v_milestone_rewards := 250000;
    ELSIF v_fully_verified_count >= 25 THEN
        v_milestone_rewards := 125000;
    ELSIF v_fully_verified_count >= 12 THEN
        v_milestone_rewards := 50000;
    ELSIF v_fully_verified_count >= 6 THEN
        v_milestone_rewards := 22500;
    ELSIF v_fully_verified_count >= 3 THEN
        v_milestone_rewards := 12500;
    ELSIF v_fully_verified_count >= 1 THEN
        v_milestone_rewards := 5000;
    END IF;
    
    -- Calculate total earnings (referral + milestone rewards only)
    v_total_earnings := v_referral_rewards + v_milestone_rewards;
    
    -- Update the referral_stats table
    UPDATE public.referral_stats
    SET 
        referral_rewards = v_referral_rewards,
        milestone_rewards = v_milestone_rewards,
        pending_rewards = v_pending_rewards,
        total_earnings = v_total_earnings,
        verified_referrals = v_fully_verified_count,
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
            verified_referrals,
            created_at,
            updated_at
        ) VALUES (
            v_referrer_id, 
            v_referral_rewards, 
            v_milestone_rewards, 
            v_pending_rewards, 
            v_total_earnings,
            v_fully_verified_count,
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
    v_user_id UUID;
BEGIN
    -- Calculate rewards for all users
    FOR v_user_id IN SELECT id FROM auth.users LOOP
        PERFORM calculate_referral_rewards(v_user_id);
    END LOOP;
END
$$;

COMMIT;

-- Create a separate function to calculate rewards for a specific user
CREATE OR REPLACE FUNCTION calculate_referral_rewards(p_user_id UUID) 
RETURNS VOID AS $$
DECLARE
    v_referral_rewards BIGINT := 0;
    v_milestone_rewards BIGINT := 0;
    v_pending_rewards BIGINT := 0;
    v_total_earnings BIGINT := 0;
    v_referral RECORD;
    v_completed_steps INT;
    v_is_fully_verified BOOLEAN;
    v_fully_verified_count INT := 0;
    v_tier RECORD;
    v_referral_code TEXT;
BEGIN
    -- Get the user's referral code
    SELECT referral_code INTO v_referral_code FROM public.profiles WHERE id = p_user_id;
    
    IF v_referral_code IS NULL THEN
        RETURN;
    END IF;

    -- Calculate rewards for all referrals of this user
    FOR v_referral IN 
        SELECT 
            email IS NOT NULL AS email_verified,
            twitter_verified,
            telegram_verified,
            twitter_shared,
            first_referral
        FROM public.profiles
        WHERE referred_by = v_referral_code
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
        
        -- Calculate referral rewards - each step is worth 1000 TAU
        v_referral_rewards := v_referral_rewards + (v_completed_steps * 1000);
        
        -- Track fully verified referrals for milestone rewards
        IF v_is_fully_verified THEN
            v_fully_verified_count := v_fully_verified_count + 1;
        END IF;
        
        -- Calculate pending rewards - remaining steps are worth 1000 TAU each
        v_pending_rewards := v_pending_rewards + ((5 - v_completed_steps) * 1000);
    END LOOP;
    
    -- Calculate milestone rewards based on tiers
    v_milestone_rewards := 0;
    
    -- Define milestone tiers and find the highest tier achieved
    IF v_fully_verified_count >= 100 THEN
        v_milestone_rewards := 500000;
    ELSIF v_fully_verified_count >= 50 THEN
        v_milestone_rewards := 250000;
    ELSIF v_fully_verified_count >= 25 THEN
        v_milestone_rewards := 125000;
    ELSIF v_fully_verified_count >= 12 THEN
        v_milestone_rewards := 50000;
    ELSIF v_fully_verified_count >= 6 THEN
        v_milestone_rewards := 22500;
    ELSIF v_fully_verified_count >= 3 THEN
        v_milestone_rewards := 12500;
    ELSIF v_fully_verified_count >= 1 THEN
        v_milestone_rewards := 5000;
    END IF;
    
    -- Calculate total earnings (referral + milestone rewards only)
    v_total_earnings := v_referral_rewards + v_milestone_rewards;
    
    -- Update the referral_stats table
    UPDATE public.referral_stats
    SET 
        referral_rewards = v_referral_rewards,
        milestone_rewards = v_milestone_rewards,
        pending_rewards = v_pending_rewards,
        total_earnings = v_total_earnings,
        verified_referrals = v_fully_verified_count,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO public.referral_stats (
            user_id, 
            referral_rewards, 
            milestone_rewards, 
            pending_rewards, 
            total_earnings,
            verified_referrals,
            created_at,
            updated_at
        ) VALUES (
            p_user_id, 
            v_referral_rewards, 
            v_milestone_rewards, 
            v_pending_rewards, 
            v_total_earnings,
            v_fully_verified_count,
            NOW(),
            NOW()
        );
    END IF;
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
            'calculate_referral_rewards',
            'Error in calculate_referral_rewards function: ' || SQLERRM,
            SQLSTATE,
            jsonb_build_object('user_id', p_user_id)
        );
END;
$$ LANGUAGE plpgsql;

-- Recalculate rewards for all users
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    FOR v_user_id IN SELECT id FROM auth.users LOOP
        PERFORM calculate_referral_rewards(v_user_id);
    END LOOP;
END $$;
