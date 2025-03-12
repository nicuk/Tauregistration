-- Activate the progressive rewards trigger
BEGIN;

-- Drop any existing trigger that might conflict
DROP TRIGGER IF EXISTS update_referral_stats_on_verification_trigger ON public.profiles;

-- Create the new trigger
CREATE TRIGGER update_progressive_rewards_trigger
AFTER UPDATE OF 
    email, 
    twitter_verified, 
    telegram_verified, 
    twitter_shared, 
    first_referral
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_progressive_rewards();

-- Log the activation
INSERT INTO public.registration_error_log (
    step,
    error_message,
    error_state,
    user_data
)
VALUES (
    'activate_progressive_rewards',
    'Progressive rewards trigger activated successfully',
    'INFO',
    jsonb_build_object(
        'timestamp', NOW(),
        'action', 'Trigger activation'
    )
);

COMMIT;

-- To rollback if needed, run:
-- SELECT public.rollback_progressive_rewards_changes();
