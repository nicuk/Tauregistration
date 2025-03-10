-- Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM 
  information_schema.triggers
WHERE 
  event_object_table = 'profiles'
  AND trigger_name = 'initialize_referral_stats_trigger';

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS initialize_referral_stats_trigger ON profiles;

CREATE TRIGGER initialize_referral_stats_trigger
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION initialize_referral_stats();

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM 
  information_schema.triggers
WHERE 
  event_object_table = 'profiles'
  AND trigger_name = 'initialize_referral_stats_trigger';
