-- =============================================
-- SAFE EMAIL VERIFICATION FIX FOR PROGRESSIVE REWARDS
-- =============================================
-- This script fixes email verification for both users and referrers
-- without affecting the normal email verification flow
-- =============================================

-- Start transaction so we can rollback if needed
BEGIN;

-- 1. Create a helper function specifically for progressive rewards
-- This function ONLY checks auth.users.email_confirmed_at to maintain consistency
CREATE OR REPLACE FUNCTION public.progressive_rewards_check_email_verified(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_verified BOOLEAN;
BEGIN
    -- Check if email_confirmed_at is not null in auth.users table
    SELECT 
        email_confirmed_at IS NOT NULL INTO v_is_verified
    FROM 
        auth.users
    WHERE 
        id = user_id;
    
    RETURN COALESCE(v_is_verified, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to synchronize profiles.email_verified with auth.users.email_confirmed_at
-- This ensures both fields are consistent for all users
CREATE OR REPLACE FUNCTION public.synchronize_email_verification()
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER := 0;
    v_user RECORD;
    v_result TEXT;
BEGIN
    -- Find users where email_confirmed_at and email_verified don't match
    FOR v_user IN
        SELECT 
            au.id,
            au.email,
            au.email_confirmed_at IS NOT NULL AS auth_verified,
            p.email_verified AS profile_verified
        FROM 
            auth.users au
        JOIN 
            public.profiles p ON p.id = au.id
        WHERE 
            (au.email_confirmed_at IS NOT NULL) != COALESCE(p.email_verified, FALSE)
    LOOP
        -- Update profiles.email_verified to match auth.users.email_confirmed_at
        UPDATE public.profiles
        SET email_verified = (v_user.auth_verified)
        WHERE id = v_user.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    v_result := 'Synchronized email verification status for ' || v_count || ' users.';
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 3. Update the update_progressive_rewards trigger function to use our helper function
CREATE OR REPLACE FUNCTION public.update_progressive_rewards()
RETURNS TRIGGER AS $$
DECLARE
    v_user_progress NUMERIC;
    v_base_reward NUMERIC := 10000.00;
    v_user_unlocked_amount NUMERIC;
    v_user_pending_amount NUMERIC;
    v_referrer_code TEXT;
    v_referrer_id UUID;
    v_referrer_twitter_verified BOOLEAN;
    v_referrer_telegram_verified BOOLEAN;
    v_referrer_twitter_shared BOOLEAN;
    v_referrer_first_referral BOOLEAN;
    v_referrer_progress NUMERIC;
    v_referrer_unlocked_amount NUMERIC;
    v_referrer_pending_amount NUMERIC;
    v_email_verified BOOLEAN;
BEGIN
    -- Only proceed if this is a verification step update
    IF (
        (OLD.twitter_verified IS DISTINCT FROM NEW.twitter_verified) OR
        (OLD.telegram_verified IS DISTINCT FROM NEW.telegram_verified) OR
        (OLD.twitter_shared IS DISTINCT FROM NEW.twitter_shared) OR
        (OLD.first_referral IS DISTINCT FROM NEW.first_referral) OR
        (OLD.email_verified IS DISTINCT FROM NEW.email_verified)  -- Also trigger on email_verified changes
    ) THEN
        -- PART 1: Update the user's own rewards
        
        -- Check if email is verified using our helper function
        -- This will ONLY check auth.users.email_confirmed_at to maintain consistency
        v_email_verified := public.progressive_rewards_check_email_verified(NEW.id);
        
        -- Calculate progress percentage (0.0 to 1.0)
        v_user_progress := 0;
        IF v_email_verified THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF NEW.twitter_verified THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF NEW.telegram_verified THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF NEW.twitter_shared THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF NEW.first_referral THEN v_user_progress := v_user_progress + 0.2; END IF;
        
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
            -- Update pending rewards
            pending_rewards = v_user_pending_amount,
            -- Update total earnings (milestone + referral)
            total_earnings = v_user_unlocked_amount + COALESCE(referral_rewards, 0),
            -- Update timestamp
            updated_at = NOW()
        WHERE user_id = NEW.id;
        
        -- PART 2: Update the referrer's rewards if this user was referred
        -- Get the referrer's code
        v_referrer_code := NEW.referred_by;
        
        -- If there's a referrer, update their rewards too
        IF v_referrer_code IS NOT NULL AND v_referrer_code != '' THEN
            -- Find the referrer's ID
            SELECT id INTO v_referrer_id
            FROM public.profiles
            WHERE public.profiles.referral_code = v_referrer_code;
            
            -- If referrer found, update their rewards
            IF v_referrer_id IS NOT NULL THEN
                -- Get referrer's verification status
                SELECT 
                    twitter_verified,
                    telegram_verified,
                    twitter_shared,
                    first_referral
                INTO 
                    v_referrer_twitter_verified,
                    v_referrer_telegram_verified,
                    v_referrer_twitter_shared,
                    v_referrer_first_referral
                FROM 
                    public.profiles
                WHERE 
                    id = v_referrer_id;
                
                -- Check if referrer's email is verified using our helper function
                v_email_verified := public.progressive_rewards_check_email_verified(v_referrer_id);
                
                -- Calculate referrer's progress
                v_referrer_progress := 0;
                IF v_email_verified THEN v_referrer_progress := v_referrer_progress + 0.2; END IF;
                IF v_referrer_twitter_verified THEN v_referrer_progress := v_referrer_progress + 0.2; END IF;
                IF v_referrer_telegram_verified THEN v_referrer_progress := v_referrer_progress + 0.2; END IF;
                IF v_referrer_twitter_shared THEN v_referrer_progress := v_referrer_progress + 0.2; END IF;
                IF v_referrer_first_referral THEN v_referrer_progress := v_referrer_progress + 0.2; END IF;
                
                -- Calculate referrer's unlocked amount
                v_referrer_unlocked_amount := v_base_reward * v_referrer_progress;
                
                -- Calculate referrer's pending amount
                v_referrer_pending_amount := v_base_reward - v_referrer_unlocked_amount;
                
                -- Update the referrer's referral_stats
                UPDATE public.referral_stats
                SET 
                    -- Individual rewards stay the same
                    milestone_rewards = v_referrer_unlocked_amount,
                    -- Update unlocked percentage
                    unlocked_percentage = (v_referrer_progress * 100)::INTEGER,
                    -- Update pending rewards
                    pending_rewards = v_referrer_pending_amount,
                    -- Update total earnings (milestone + referral)
                    total_earnings = v_referrer_unlocked_amount + COALESCE(referral_rewards, 0),
                    -- Update timestamp
                    updated_at = NOW()
                WHERE user_id = v_referrer_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        INSERT INTO public.registration_error_log (
            step,
            error_message,
            details,
            user_id,
            username,
            email,
            referral_code,
            referred_by
        ) VALUES (
            'update_progressive_rewards_trigger',
            SQLERRM,
            'Error in update_progressive_rewards trigger: ' || SQLSTATE,
            NEW.id,
            NEW.username,
            NEW.email,
            NEW.referral_code,
            NEW.referred_by
        );
        
        -- Continue with the transaction
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to update the trigger to fire on email_verified changes
CREATE OR REPLACE FUNCTION public.update_progressive_rewards_trigger()
RETURNS VOID AS $$
BEGIN
    -- Drop the existing trigger if it exists
    DROP TRIGGER IF EXISTS update_progressive_rewards_trigger ON public.profiles;
    
    -- Create a new trigger that also fires on email_verified changes
    CREATE TRIGGER update_progressive_rewards_trigger
    AFTER UPDATE OF twitter_verified, telegram_verified, twitter_shared, first_referral, email_verified
    ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_progressive_rewards();
    
    RAISE NOTICE 'Progressive rewards trigger updated to include email_verified changes';
END;
$$ LANGUAGE plpgsql;

-- 5. Execute the function to update the trigger
SELECT public.update_progressive_rewards_trigger();

-- 6. Synchronize email verification status for all users
SELECT public.synchronize_email_verification();

-- 7. Create a function to update all users' rewards based on their current verification status
CREATE OR REPLACE FUNCTION public.update_all_users_rewards()
RETURNS TEXT AS $$
DECLARE
    v_user RECORD;
    v_user_progress NUMERIC;
    v_base_reward NUMERIC := 10000.00;
    v_user_unlocked_amount NUMERIC;
    v_user_pending_amount NUMERIC;
    v_count INTEGER := 0;
    v_result TEXT;
    v_email_verified BOOLEAN;
BEGIN
    -- Process each user
    FOR v_user IN 
        SELECT 
            p.id, 
            p.username,
            p.twitter_verified,
            p.telegram_verified,
            p.twitter_shared,
            p.first_referral
        FROM public.profiles p
    LOOP
        -- Check if email is verified using our helper function
        v_email_verified := public.progressive_rewards_check_email_verified(v_user.id);
        
        -- Calculate progress percentage (0.0 to 1.0)
        v_user_progress := 0;
        IF v_email_verified THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF v_user.twitter_verified THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF v_user.telegram_verified THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF v_user.twitter_shared THEN v_user_progress := v_user_progress + 0.2; END IF;
        IF v_user.first_referral THEN v_user_progress := v_user_progress + 0.2; END IF;
        
        -- Calculate unlocked amount
        v_user_unlocked_amount := v_base_reward * v_user_progress;
        
        -- Calculate pending amount
        v_user_pending_amount := v_base_reward - v_user_unlocked_amount;
        
        -- Update the user's rewards
        UPDATE public.referral_stats
        SET 
            milestone_rewards = v_user_unlocked_amount,
            unlocked_percentage = (v_user_progress * 100)::INTEGER,
            pending_rewards = v_user_pending_amount,
            total_earnings = v_user_unlocked_amount + COALESCE(referral_rewards, 0),
            updated_at = NOW()
        WHERE user_id = v_user.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    v_result := 'Updated rewards for ' || v_count || ' users with correct email verification status.';
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Commit the transaction
COMMIT;

-- INSTRUCTIONS:
-- 1. Run this script to update the email verification logic for both users and referrers
-- 2. This script will:
--    a. Update the progressive_rewards_check_email_verified function to ONLY check auth.users.email_confirmed_at
--    b. Synchronize profiles.email_verified with auth.users.email_confirmed_at for all users
--    c. Update the trigger to fire on email_verified changes
--    d. Update all users' rewards based on their current verification status
-- 3. The normal email verification flow will not be affected, as we're only changing how the rewards system checks verification
