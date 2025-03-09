-- Update the profiles table and policies
CREATE OR REPLACE FUNCTION create_profiles_table()
RETURNS void AS $$
BEGIN
    -- ... (keep the existing profiles table creation code)
END;
$$ LANGUAGE plpgsql;

-- Execute the function to ensure the table and policies are up to date
SELECT create_profiles_table();

-- Create the referral_stats table
CREATE TABLE IF NOT EXISTS public.referral_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    total_referrals INTEGER DEFAULT 0,
    completed_verifications INTEGER DEFAULT 0,
    total_earnings NUMERIC(20, 2) DEFAULT 0,
    claimed_rewards NUMERIC(20, 2) DEFAULT 0,
    pending_rewards NUMERIC(20, 2) DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security on referral_stats
ALTER TABLE public.referral_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for referral_stats
CREATE POLICY "Users can read own referral stats"
    ON public.referral_stats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage referral stats"
    ON public.referral_stats
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_stats_user_id ON public.referral_stats(user_id);

-- Grant necessary permissions
GRANT ALL ON public.referral_stats TO authenticated;
GRANT ALL ON public.referral_stats TO service_role;

-- Create a function to update referral stats
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert into referral_stats
    INSERT INTO public.referral_stats (user_id, total_referrals, total_earnings, pending_rewards)
    VALUES (NEW.id, NEW.total_referrals, NEW.total_earnings, NEW.pending_rewards)
    ON CONFLICT (user_id) DO UPDATE
    SET 
        total_referrals = NEW.total_referrals,
        total_earnings = NEW.total_earnings,
        pending_rewards = NEW.pending_rewards,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update referral_stats when profiles are updated
CREATE TRIGGER update_referral_stats_trigger
AFTER INSERT OR UPDATE OF total_referrals, total_earnings, pending_rewards ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_referral_stats();

-- ... (keep the existing referral code generation functions and triggers)

