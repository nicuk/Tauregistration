-- Simplified approach to update referral tracking system

-- 1. First, ensure the profiles table has the necessary columns
DO $$
BEGIN
  -- Add email_verified column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
    -- Update existing records - if email exists, consider it verified
    UPDATE public.profiles SET email_verified = (email IS NOT NULL AND email != '');
  END IF;
  
  -- Add other verification columns if they don't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'twitter_verified'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN twitter_verified BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'telegram_verified'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN telegram_verified BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'twitter_shared'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN twitter_shared BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'first_referral'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN first_referral BOOLEAN DEFAULT false;
  END IF;
END
$$;

-- 2. Ensure the referral_stats table has the necessary columns
DO $$
BEGIN
  -- Create the table if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'referral_stats'
  ) THEN
    CREATE TABLE public.referral_stats (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) NOT NULL,
      total_referrals INTEGER DEFAULT 0,
      verified_referrals INTEGER DEFAULT 0,
      active_referrals INTEGER DEFAULT 0,
      rank INTEGER DEFAULT 0,
      total_earnings INTEGER DEFAULT 0,
      unlocked_rewards INTEGER DEFAULT 0,
      unlocked_percentage FLOAT DEFAULT 0,
      overall_completion_percentage FLOAT DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  ELSE
    -- Add columns if they don't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'referral_stats' AND column_name = 'verified_referrals'
    ) THEN
      ALTER TABLE public.referral_stats ADD COLUMN verified_referrals INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'referral_stats' AND column_name = 'active_referrals'
    ) THEN
      ALTER TABLE public.referral_stats ADD COLUMN active_referrals INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'referral_stats' AND column_name = 'unlocked_rewards'
    ) THEN
      ALTER TABLE public.referral_stats ADD COLUMN unlocked_rewards INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'referral_stats' AND column_name = 'unlocked_percentage'
    ) THEN
      ALTER TABLE public.referral_stats ADD COLUMN unlocked_percentage FLOAT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'referral_stats' AND column_name = 'overall_completion_percentage'
    ) THEN
      ALTER TABLE public.referral_stats ADD COLUMN overall_completion_percentage FLOAT DEFAULT 0;
    END IF;
  END IF;
END
$$;

-- 3. Update profiles with total_referrals count
UPDATE profiles p
SET total_referrals = (
  SELECT COUNT(*) 
  FROM profiles 
  WHERE referred_by = p.referral_code
);

-- 4. Update profiles with first_referral status
UPDATE profiles p
SET first_referral = (
  SELECT COUNT(*) > 0 
  FROM profiles 
  WHERE referred_by = p.referral_code
);

-- 5. Manual update of referral_stats table
-- This is a simpler approach than using a complex function
WITH referrer_stats AS (
  SELECT 
    p.id as user_id,
    p.referral_code,
    COUNT(r.id) as total_referrals,
    SUM(CASE WHEN 
      r.email IS NOT NULL AND 
      r.twitter_verified AND 
      r.telegram_verified AND 
      r.twitter_shared AND 
      r.first_referral 
    THEN 1 ELSE 0 END) as verified_referrals,
    SUM(CASE WHEN 
      r.email IS NOT NULL OR 
      r.twitter_verified OR 
      r.telegram_verified OR 
      r.twitter_shared OR 
      r.first_referral 
    THEN 1 ELSE 0 END) as active_referrals,
    -- Calculate average completion percentage for all referrals
    AVG(
      (CASE WHEN r.email IS NOT NULL THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.telegram_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_shared THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.first_referral THEN 0.2 ELSE 0 END)
    ) * 100 as overall_completion_percentage,
    -- Calculate unlocked percentage (20% per step)
    SUM(
      (CASE WHEN r.email IS NOT NULL THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.telegram_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_shared THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.first_referral THEN 0.2 ELSE 0 END)
    ) * 100 / NULLIF(COUNT(r.id), 0) as unlocked_percentage,
    -- Calculate unlocked rewards (2000 TAU per step, max 10000 per referral)
    SUM(
      (CASE WHEN r.email IS NOT NULL THEN 2000 ELSE 0 END) +
      (CASE WHEN r.twitter_verified THEN 2000 ELSE 0 END) +
      (CASE WHEN r.telegram_verified THEN 2000 ELSE 0 END) +
      (CASE WHEN r.twitter_shared THEN 2000 ELSE 0 END) +
      (CASE WHEN r.first_referral THEN 2000 ELSE 0 END)
    ) as unlocked_rewards
  FROM 
    profiles p
  LEFT JOIN 
    profiles r ON r.referred_by = p.referral_code
  WHERE 
    EXISTS (SELECT 1 FROM profiles WHERE referred_by = p.referral_code)
  GROUP BY 
    p.id, p.referral_code
),
ranked_stats AS (
  SELECT 
    rs.*,
    ROW_NUMBER() OVER (ORDER BY rs.total_referrals DESC) as rank
  FROM 
    referrer_stats rs
)
-- Insert or update referral_stats records
MERGE INTO referral_stats rs
USING ranked_stats rs_new ON rs.user_id = rs_new.user_id
WHEN MATCHED THEN
  UPDATE SET 
    total_referrals = rs_new.total_referrals,
    verified_referrals = rs_new.verified_referrals,
    active_referrals = rs_new.active_referrals,
    rank = rs_new.rank,
    total_earnings = rs_new.unlocked_rewards,
    unlocked_rewards = rs_new.unlocked_rewards,
    unlocked_percentage = rs_new.unlocked_percentage,
    overall_completion_percentage = rs_new.overall_completion_percentage,
    updated_at = now()
WHEN NOT MATCHED THEN
  INSERT (
    user_id, 
    total_referrals, 
    verified_referrals,
    active_referrals,
    rank,
    total_earnings,
    unlocked_rewards,
    unlocked_percentage,
    overall_completion_percentage
  ) VALUES (
    rs_new.user_id, 
    rs_new.total_referrals, 
    rs_new.verified_referrals,
    rs_new.active_referrals,
    rs_new.rank,
    rs_new.unlocked_rewards,
    rs_new.unlocked_rewards,
    rs_new.unlocked_percentage,
    rs_new.overall_completion_percentage
  );

-- 6. Alternative approach if MERGE is not supported
-- First update existing records
WITH referrer_stats AS (
  SELECT 
    p.id as user_id,
    p.referral_code,
    COUNT(r.id) as total_referrals,
    SUM(CASE WHEN 
      r.email IS NOT NULL AND 
      r.twitter_verified AND 
      r.telegram_verified AND 
      r.twitter_shared AND 
      r.first_referral 
    THEN 1 ELSE 0 END) as verified_referrals,
    SUM(CASE WHEN 
      r.email IS NOT NULL OR 
      r.twitter_verified OR 
      r.telegram_verified OR 
      r.twitter_shared OR 
      r.first_referral 
    THEN 1 ELSE 0 END) as active_referrals,
    AVG(
      (CASE WHEN r.email IS NOT NULL THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.telegram_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_shared THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.first_referral THEN 0.2 ELSE 0 END)
    ) * 100 as overall_completion_percentage,
    SUM(
      (CASE WHEN r.email IS NOT NULL THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.telegram_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_shared THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.first_referral THEN 0.2 ELSE 0 END)
    ) * 100 / NULLIF(COUNT(r.id), 0) as unlocked_percentage,
    SUM(
      (CASE WHEN r.email IS NOT NULL THEN 2000 ELSE 0 END) +
      (CASE WHEN r.twitter_verified THEN 2000 ELSE 0 END) +
      (CASE WHEN r.telegram_verified THEN 2000 ELSE 0 END) +
      (CASE WHEN r.twitter_shared THEN 2000 ELSE 0 END) +
      (CASE WHEN r.first_referral THEN 2000 ELSE 0 END)
    ) as unlocked_rewards
  FROM 
    profiles p
  LEFT JOIN 
    profiles r ON r.referred_by = p.referral_code
  WHERE 
    EXISTS (SELECT 1 FROM profiles WHERE referred_by = p.referral_code)
  GROUP BY 
    p.id, p.referral_code
),
ranked_stats AS (
  SELECT 
    rs.*,
    ROW_NUMBER() OVER (ORDER BY rs.total_referrals DESC) as rank
  FROM 
    referrer_stats rs
)
UPDATE referral_stats rs
SET 
  total_referrals = rs_new.total_referrals,
  verified_referrals = rs_new.verified_referrals,
  active_referrals = rs_new.active_referrals,
  rank = rs_new.rank,
  total_earnings = rs_new.unlocked_rewards,
  unlocked_rewards = rs_new.unlocked_rewards,
  unlocked_percentage = rs_new.unlocked_percentage,
  overall_completion_percentage = rs_new.overall_completion_percentage,
  updated_at = now()
FROM 
  ranked_stats rs_new
WHERE 
  rs.user_id = rs_new.user_id;

-- Then insert new records
WITH referrer_stats AS (
  SELECT 
    p.id as user_id,
    p.referral_code,
    COUNT(r.id) as total_referrals,
    SUM(CASE WHEN 
      r.email IS NOT NULL AND 
      r.twitter_verified AND 
      r.telegram_verified AND 
      r.twitter_shared AND 
      r.first_referral 
    THEN 1 ELSE 0 END) as verified_referrals,
    SUM(CASE WHEN 
      r.email IS NOT NULL OR 
      r.twitter_verified OR 
      r.telegram_verified OR 
      r.twitter_shared OR 
      r.first_referral 
    THEN 1 ELSE 0 END) as active_referrals,
    AVG(
      (CASE WHEN r.email IS NOT NULL THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.telegram_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_shared THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.first_referral THEN 0.2 ELSE 0 END)
    ) * 100 as overall_completion_percentage,
    SUM(
      (CASE WHEN r.email IS NOT NULL THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.telegram_verified THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.twitter_shared THEN 0.2 ELSE 0 END) +
      (CASE WHEN r.first_referral THEN 0.2 ELSE 0 END)
    ) * 100 / NULLIF(COUNT(r.id), 0) as unlocked_percentage,
    SUM(
      (CASE WHEN r.email IS NOT NULL THEN 2000 ELSE 0 END) +
      (CASE WHEN r.twitter_verified THEN 2000 ELSE 0 END) +
      (CASE WHEN r.telegram_verified THEN 2000 ELSE 0 END) +
      (CASE WHEN r.twitter_shared THEN 2000 ELSE 0 END) +
      (CASE WHEN r.first_referral THEN 2000 ELSE 0 END)
    ) as unlocked_rewards
  FROM 
    profiles p
  LEFT JOIN 
    profiles r ON r.referred_by = p.referral_code
  WHERE 
    EXISTS (SELECT 1 FROM profiles WHERE referred_by = p.referral_code)
  GROUP BY 
    p.id, p.referral_code
),
ranked_stats AS (
  SELECT 
    rs.*,
    ROW_NUMBER() OVER (ORDER BY rs.total_referrals DESC) as rank
  FROM 
    referrer_stats rs
),
existing_stats AS (
  SELECT user_id FROM referral_stats
)
INSERT INTO referral_stats (
  user_id, 
  total_referrals, 
  verified_referrals,
  active_referrals,
  rank,
  total_earnings,
  unlocked_rewards,
  unlocked_percentage,
  overall_completion_percentage
)
SELECT 
  rs_new.user_id, 
  rs_new.total_referrals, 
  rs_new.verified_referrals,
  rs_new.active_referrals,
  rs_new.rank,
  rs_new.unlocked_rewards,
  rs_new.unlocked_rewards,
  rs_new.unlocked_percentage,
  rs_new.overall_completion_percentage
FROM 
  ranked_stats rs_new
WHERE 
  NOT EXISTS (
    SELECT 1 FROM existing_stats es WHERE es.user_id = rs_new.user_id
  );

-- 7. Check the results
SELECT * FROM referral_stats ORDER BY rank LIMIT 10;
