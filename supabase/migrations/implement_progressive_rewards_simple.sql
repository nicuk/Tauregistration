-- =============================================
-- IMPLEMENT PROGRESSIVE REWARDS CALCULATION (SIMPLE VERSION)
-- =============================================
-- This script enhances the existing reward calculation system
-- with a simpler approach and backup/rollback capabilities
-- =============================================

-- Start transaction so we can rollback if needed
BEGIN;

-- 1. Create a backup of current data
CREATE TABLE IF NOT EXISTS backup_20250312_referral_stats AS 
SELECT * FROM public.referral_stats;

-- 2. Create a function to show what will change
CREATE OR REPLACE FUNCTION public.preview_progressive_rewards_changes()
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    current_milestone_rewards NUMERIC,
    new_milestone_rewards NUMERIC,
    current_referral_rewards NUMERIC,
    new_referral_rewards NUMERIC,
    current_total_earnings NUMERIC,
    new_total_earnings NUMERIC,
    current_pending_rewards NUMERIC,
    new_pending_rewards NUMERIC,
    difference NUMERIC
) AS $$
DECLARE
    v_profile RECORD;
    v_user_progress NUMERIC;
    v_base_reward NUMERIC := 10000.00;
    v_user_unlocked_amount NUMERIC;
    v_user_pending_amount NUMERIC;
BEGIN
    -- Create temporary table to store results
    CREATE TEMP TABLE IF NOT EXISTS preview_results (
        user_id UUID,
        username TEXT,
        current_milestone_rewards NUMERIC,
        new_milestone_rewards NUMERIC,
        current_referral_rewards NUMERIC,
        new_referral_rewards NUMERIC,
        current_total_earnings NUMERIC,
        new_total_earnings NUMERIC,
        current_pending_rewards NUMERIC,
        new_pending_rewards NUMERIC,
        difference NUMERIC
    );
    
    -- Process each profile
    FOR v_profile IN SELECT p.*, rs.milestone_rewards, rs.referral_rewards, rs.total_earnings, rs.pending_rewards
                     FROM public.profiles p
                     LEFT JOIN public.referral_stats rs ON p.id = rs.user_id
                     -- Limit to 100 for preview
                     LIMIT 100
    LOOP
        -- Calculate progress percentage (0.0 to 1.0)
        v_user_progress := 0;
        IF v_profile.email IS NOT NULL THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF v_profile.twitter_verified THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF v_profile.telegram_verified THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF v_profile.twitter_shared THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF v_profile.first_referral THEN v_user_progress := v_user_progress + 0.2; END IF;
        
        -- Calculate unlocked amount
        v_user_unlocked_amount := v_base_reward * v_user_progress;
        
        -- Calculate pending amount
        v_user_pending_amount := v_base_reward - v_user_unlocked_amount;
        
        -- Insert into preview results
        INSERT INTO preview_results VALUES (
            v_profile.id,
            v_profile.username,
            COALESCE(v_profile.milestone_rewards, 0),
            v_user_unlocked_amount,
            COALESCE(v_profile.referral_rewards, 0),
            COALESCE(v_profile.referral_rewards, 0), -- Keeping referral rewards the same for preview
            COALESCE(v_profile.total_earnings, 0),
            v_user_unlocked_amount + COALESCE(v_profile.referral_rewards, 0),
            COALESCE(v_profile.pending_rewards, 0),
            v_user_pending_amount,
            (v_user_unlocked_amount + COALESCE(v_profile.referral_rewards, 0)) - COALESCE(v_profile.total_earnings, 0)
        );
    END LOOP;
    
    -- Return the results
    RETURN QUERY SELECT * FROM preview_results ORDER BY ABS(difference) DESC;
    
    -- Clean up
    DROP TABLE IF EXISTS preview_results;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a rollback function
CREATE OR REPLACE FUNCTION public.rollback_progressive_rewards_changes()
RETURNS void AS $$
BEGIN
    -- Drop the new trigger
    DROP TRIGGER IF EXISTS update_progressive_rewards_trigger ON public.profiles;
    
    -- Drop the new functions
    DROP FUNCTION IF EXISTS public.update_progressive_rewards();
    DROP FUNCTION IF EXISTS public.calculate_verification_progress();
    
    -- Restore data from backup
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_20250312_referral_stats') THEN
        -- Delete current data
        DELETE FROM public.referral_stats;
        
        -- Insert backup data
        INSERT INTO public.referral_stats
        SELECT * FROM backup_20250312_referral_stats;
        
        RAISE NOTICE 'Referral stats data has been restored from backup.';
    END IF;
    
    RAISE NOTICE 'Progressive rewards changes have been rolled back.';
END;
$$ LANGUAGE plpgsql;

-- 4. Create the calculate_verification_progress function
CREATE OR REPLACE FUNCTION public.calculate_verification_progress(
    p_email_verified BOOLEAN,
    p_twitter_verified BOOLEAN, 
    p_telegram_verified BOOLEAN,
    p_twitter_shared BOOLEAN,
    p_first_referral BOOLEAN
) RETURNS NUMERIC AS $$
DECLARE
    v_progress NUMERIC := 0;
BEGIN
    -- Each step is worth 20%
    IF p_email_verified THEN v_progress := v_progress + 0.2; END IF;
    IF p_twitter_verified THEN v_progress := v_progress + 0.2; END IF;
    IF p_telegram_verified THEN v_progress := v_progress + 0.2; END IF;
    IF p_twitter_shared THEN v_progress := v_progress + 0.2; END IF;
    IF p_first_referral THEN v_progress := v_progress + 0.2; END IF;
    
    RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- 5. Create the update_progressive_rewards function
CREATE OR REPLACE FUNCTION public.update_progressive_rewards()
RETURNS TRIGGER AS $$
DECLARE
    -- Constants for reward amounts
    v_base_reward NUMERIC := 10000.00; -- Base reward for completing all steps
    v_referral_reward NUMERIC := 10000.00; -- Reward per fully verified referral
    
    -- Variables for user's own rewards
    v_user_progress NUMERIC;
    v_user_unlocked_amount NUMERIC;
    v_user_pending_amount NUMERIC;
    
    -- Variables for referral rewards
    v_referrer_code TEXT;
    v_referrer_id UUID;
    v_referral_progress NUMERIC;
    v_referral_unlocked_amount NUMERIC;
    v_referral_pending_amount NUMERIC;
    v_referral_details JSONB;
    v_verified_referrals INTEGER := 0;
    v_total_referrals INTEGER := 0;
    v_milestone_rewards NUMERIC;
    v_referral_rewards NUMERIC;
    v_total_pending_rewards NUMERIC;
BEGIN
    -- Only proceed if this is a verification step update
    IF (
        (OLD.twitter_verified IS DISTINCT FROM NEW.twitter_verified) OR
        (OLD.telegram_verified IS DISTINCT FROM NEW.telegram_verified) OR
        (OLD.twitter_shared IS DISTINCT FROM NEW.twitter_shared) OR
        (OLD.email IS DISTINCT FROM NEW.email) OR
        (OLD.first_referral IS DISTINCT FROM NEW.first_referral)
    ) THEN
        -- PART 1: Update the user's own rewards
        -- Calculate progress percentage (0.0 to 1.0)
        v_user_progress := public.calculate_verification_progress(
            NEW.email IS NOT NULL, 
            NEW.twitter_verified, 
            NEW.telegram_verified,
            NEW.twitter_shared,
            NEW.first_referral
        );
        
        -- Calculate unlocked amount
        v_user_unlocked_amount := v_base_reward * v_user_progress;
        
        -- Calculate pending amount (what's left to unlock)
        v_user_pending_amount := v_base_reward - v_user_unlocked_amount;
        
        -- Update the user's referral_stats with their individual rewards
        UPDATE public.referral_stats
        SET 
            -- Individual rewards are stored in milestone_rewards
            milestone_rewards = v_user_unlocked_amount,
            -- Update unlocked percentage
            unlocked_percentage = (v_user_progress * 100)::INTEGER,
            -- Update overall completion percentage
            overall_completion_percentage = (v_user_progress * 100)::INTEGER,
            -- Update unlocked rewards (this is the actual unlocked amount)
            unlocked_rewards = v_user_unlocked_amount,
            -- Update pending rewards (what's left to unlock from individual rewards)
            pending_rewards = v_user_pending_amount,
            -- Update timestamp
            updated_at = NOW()
        WHERE user_id = NEW.id;
        
        -- Get the updated milestone_rewards value
        SELECT milestone_rewards INTO v_milestone_rewards
        FROM public.referral_stats
        WHERE user_id = NEW.id;
        
        -- PART 2: Update referrer's rewards if this user was referred
        -- Get the referrer's code and ID
        v_referrer_code := NEW.referred_by;
        
        IF v_referrer_code IS NOT NULL AND v_referrer_code != '' THEN
            -- Find the referrer's ID
            SELECT id INTO v_referrer_id
            FROM public.profiles
            WHERE public.profiles.referral_code = v_referrer_code;
            
            -- If we found a referrer
            IF v_referrer_id IS NOT NULL THEN
                -- Calculate progress percentage for this referral (0.0 to 1.0)
                v_referral_progress := v_user_progress; -- Same as user's progress
                
                -- Calculate unlocked amount for this referral
                v_referral_unlocked_amount := v_referral_reward * v_referral_progress;
                
                -- Calculate pending amount for this referral
                v_referral_pending_amount := v_referral_reward - v_referral_unlocked_amount;
                
                -- Get current referral details for the referrer
                SELECT 
                    referral_details,
                    verified_referrals,
                    total_referrals
                INTO 
                    v_referral_details,
                    v_verified_referrals,
                    v_total_referrals
                FROM public.referral_stats
                WHERE user_id = v_referrer_id;
                
                -- Initialize referral_details if null
                IF v_referral_details IS NULL THEN
                    v_referral_details := '{}';
                END IF;
                
                -- Update referral details with this referral's progress
                v_referral_details := jsonb_set(
                    COALESCE(v_referral_details, '{}'::jsonb),
                    ARRAY[NEW.id::text],
                    jsonb_build_object(
                        'username', NEW.username,
                        'progress', v_referral_progress,
                        'unlocked_amount', v_referral_unlocked_amount,
                        'pending_amount', v_referral_pending_amount,
                        'total_potential', v_referral_reward,
                        'email_verified', NEW.email IS NOT NULL,
                        'twitter_verified', NEW.twitter_verified,
                        'telegram_verified', NEW.telegram_verified,
                        'twitter_shared', NEW.twitter_shared,
                        'first_referral', NEW.first_referral,
                        'updated_at', NOW()
                    )
                );
                
                -- Calculate total unlocked referral rewards
                SELECT COALESCE(SUM((value->>'unlocked_amount')::NUMERIC), 0)
                INTO v_referral_rewards
                FROM jsonb_each(v_referral_details);
                
                -- Calculate total pending referral rewards
                SELECT COALESCE(SUM((value->>'pending_amount')::NUMERIC), 0)
                INTO v_total_pending_rewards
                FROM jsonb_each(v_referral_details);
                
                -- Update the referrer's stats
                UPDATE public.referral_stats
                SET 
                    -- Update referral details
                    referral_details = v_referral_details,
                    -- Update verified referrals count
                    verified_referrals = COALESCE((
                        SELECT COUNT(*) 
                        FROM jsonb_each(v_referral_details) 
                        WHERE (value->>'progress')::NUMERIC = 1.0
                    ), 0),
                    -- Update referral rewards (unlocked amount)
                    referral_rewards = v_referral_rewards,
                    -- Update total earnings (milestone + referral)
                    total_earnings = COALESCE(milestone_rewards, 0) + v_referral_rewards,
                    -- Update pending rewards (total potential - unlocked from referrals)
                    pending_rewards = v_total_pending_rewards,
                    -- Update unlocked rewards (total unlocked from all sources)
                    unlocked_rewards = COALESCE(milestone_rewards, 0) + v_referral_rewards,
                    -- Update timestamp
                    updated_at = NOW()
                WHERE user_id = v_referrer_id;
            END IF;
        END IF;
        
        -- PART 3: Update the user's total_earnings to include both milestone and referral rewards
        UPDATE public.referral_stats
        SET 
            -- Total earnings combines milestone and referral rewards
            total_earnings = COALESCE(v_milestone_rewards, 0) + COALESCE((
                SELECT referral_rewards FROM public.referral_stats WHERE user_id = NEW.id
            ), 0),
            -- Update timestamp
            updated_at = NOW()
        WHERE user_id = NEW.id;
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
            'update_progressive_rewards',
            SQLERRM,
            SQLSTATE,
            jsonb_build_object(
                'id', NEW.id,
                'email', NEW.email,
                'username', NEW.username,
                'referred_by', NEW.referred_by,
                'error', 'Error updating rewards'
            )
        );
        
        -- Continue with the transaction
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IMPORTANT: At this point, we've only created the functions but haven't activated anything yet
-- To preview what will change, run:
-- SELECT * FROM public.preview_progressive_rewards_changes();

-- To activate the changes, run these commands:
-- DROP TRIGGER IF EXISTS update_referral_stats_on_verification_trigger ON public.profiles;
-- CREATE TRIGGER update_progressive_rewards_trigger
-- AFTER UPDATE OF email, twitter_verified, telegram_verified, twitter_shared, first_referral
-- ON public.profiles
-- FOR EACH ROW
-- EXECUTE FUNCTION public.update_progressive_rewards();

-- To rollback the changes, run:
-- SELECT public.rollback_progressive_rewards_changes();

-- For now, we'll just commit the functions without activating the trigger
COMMIT;

-- INSTRUCTIONS:
-- 1. Run this script to create the preview and rollback functions
-- 2. Run SELECT * FROM public.preview_progressive_rewards_changes(); to see what will change
-- 3. If the changes look good, run the activation commands above
-- 4. If you need to rollback, run SELECT public.rollback_progressive_rewards_changes();
