-- Test profile creation with all the fields we're using in the API

-- IMPORTANT: Run this script in separate steps to capture the UUID

-- Step 1: Create a test user in auth.users and capture the UUID
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert the user and capture the ID
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data
  )
  VALUES (
    gen_random_uuid(), -- Generate a random UUID for the test user
    'test_random_9876@example.com', -- Test email
    '...', -- You don't need to provide a real encrypted password for testing
    now(), -- Email confirmed
    '{"provider": "email"}', -- App metadata
    '{"username": "testuser_random_9876", "is_pi_user": true}' -- User metadata
  )
  RETURNING id INTO new_user_id;
  
  -- Output the ID for use in the next step
  RAISE NOTICE 'Created user with ID: %', new_user_id;
  
  -- Step 2: Insert the profile using the captured ID
  INSERT INTO public.profiles (
    id,
    username,
    is_pi_user,
    pioneer_number,
    is_genesis_pioneer,
    referral_code,
    email,
    country,
    referral_source,
    total_referrals
  )
  VALUES (
    new_user_id, -- Use the actual UUID from the user creation
    'testuser_random_9876',
    true,
    1, -- Test pioneer number
    true, -- Test genesis pioneer status
    'TESTUSER9876', -- Test referral code
    'test_random_9876@example.com',
    'US',
    NULL,
    0
  );
  
  RAISE NOTICE 'Successfully created profile for user ID: %', new_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;

-- Clean up (uncomment to run after testing)
-- DELETE FROM public.profiles WHERE email = 'test_random_9876@example.com';
-- DELETE FROM auth.users WHERE email = 'test_random_9876@example.com';
