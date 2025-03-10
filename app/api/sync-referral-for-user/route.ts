import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Add type definitions for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL?: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;
    }
  }
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, referred_by")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
    }

    if (!profile.referred_by) {
      return NextResponse.json({ message: "User was not referred by anyone" }, { status: 200 });
    }

    // Get the referrer's profile
    const { data: referrerProfile, error: referrerError } = await supabaseAdmin
      .from("profiles")
      .select("id, total_referrals")
      .eq("id", profile.referred_by)
      .single();

    if (referrerError) {
      console.error("Error fetching referrer profile:", referrerError);
      return NextResponse.json({ error: "Failed to fetch referrer profile" }, { status: 500 });
    }

    // Update the referrer's total_referrals count
    const newReferralCount = (referrerProfile.total_referrals || 0) + 1;
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ total_referrals: newReferralCount })
      .eq("id", referrerProfile.id);

    if (updateError) {
      console.error("Error updating referrer's total_referrals:", updateError);
      return NextResponse.json({ error: "Failed to update referrer's total_referrals" }, { status: 500 });
    }

    // Get or create referral stats record
    const { data: existingStats, error: statsError } = await supabaseAdmin
      .from("referral_stats")
      .select("*")
      .eq("user_id", referrerProfile.id)
      .single();

    if (statsError && statsError.code !== "PGRST116") {
      console.error("Error fetching referral stats:", statsError);
      return NextResponse.json({ error: "Failed to fetch referral stats" }, { status: 500 });
    }

    // Get all referrals and check their verification status
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from("profiles")
      .select("id, twitter_verified, telegram_verified, twitter_shared, first_referral")
      .eq("referred_by", profile.referral_code);

    if (referralsError) {
      console.error("Error fetching referrals:", referralsError);
      return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
    }

    // Count fully verified referrals (all 4 steps completed)
    const verifiedReferrals = referrals.filter(ref => 
      ref.twitter_verified && ref.telegram_verified && ref.twitter_shared && ref.first_referral
    ).length;

    // Count partially verified referrals (at least one step completed)
    const activeReferrals = referrals.filter(ref => 
      ref.twitter_verified || ref.telegram_verified || ref.twitter_shared || ref.first_referral
    ).length;

    // Determine current tier based on verified referral count
    const tiers = [
      { tier: 1, required: 1 },
      { tier: 2, required: 3 },
      { tier: 3, required: 6 },
      { tier: 4, required: 12 },
      { tier: 5, required: 25 },
      { tier: 6, required: 50 },
      { tier: 7, required: 100 },
    ];

    // Use verified referrals for tier determination
    const currentTier = tiers.findIndex((t) => t.required > verifiedReferrals);
    const tier = currentTier === -1 ? 7 : currentTier;
    const nextTier = tier < 7 ? tier + 1 : 7;

    // Calculate earnings based on tier
    const tierRewards = [10000, 25000, 45000, 100000, 250000, 500000, 1000000];
    const totalEarnings = tier > 0 ? tierRewards[tier - 1] : 0;
    const pendingRewards = totalEarnings;

    // Calculate progress to next tier
    const currentThreshold = tier > 0 ? tiers[tier - 1].required : 0;
    const nextThreshold = tier < 7 ? tiers[tier].required : tiers[6].required;
    const progressToNextTier = ((verifiedReferrals - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

    if (existingStats) {
      // Update existing stats
      const { error: updateStatsError } = await supabaseAdmin
        .from("referral_stats")
        .update({
          total_referrals: newReferralCount,
          active_referrals: activeReferrals,
          verified_referrals: verifiedReferrals,
          current_tier: tier,
          next_tier: nextTier,
          current_tier_progress: progressToNextTier,
          total_earnings: totalEarnings,
          pending_rewards: pendingRewards,
          updated_at: new Date(),
        })
        .eq("user_id", referrerProfile.id);

      if (updateStatsError) {
        console.error("Error updating referral stats:", updateStatsError);
        return NextResponse.json({ error: "Failed to update referral stats" }, { status: 500 });
      }
    } else {
      // Create new stats record
      const { error: insertStatsError } = await supabaseAdmin
        .from("referral_stats")
        .insert({
          user_id: referrerProfile.id,
          total_referrals: newReferralCount,
          active_referrals: activeReferrals,
          pending_referrals: newReferralCount - activeReferrals,
          verified_referrals: verifiedReferrals,
          tier_1_referrals: verifiedReferrals >= 1 ? 1 : 0,
          tier_2_referrals: verifiedReferrals >= 3 ? 1 : 0,
          tier_3_referrals: verifiedReferrals >= 6 ? 1 : 0,
          tier_4_referrals: verifiedReferrals >= 12 ? 1 : 0,
          tier_5_referrals: verifiedReferrals >= 25 ? 1 : 0,
          tier_6_referrals: verifiedReferrals >= 50 ? 1 : 0,
          tier_7_referrals: verifiedReferrals >= 100 ? 1 : 0,
          current_tier: tier,
          next_tier: nextTier,
          current_tier_progress: progressToNextTier,
          total_earnings: totalEarnings,
          claimed_rewards: 0,
          pending_rewards: pendingRewards,
        });

      if (insertStatsError) {
        console.error("Error creating referral stats:", insertStatsError);
        return NextResponse.json({ error: "Failed to create referral stats" }, { status: 500 });
      }
    }

    // Update leaderboard rankings
    try {
      const { data: allStats, error: allStatsError } = await supabaseAdmin
        .from("referral_stats")
        .select("user_id, total_referrals")
        .order("total_referrals", { ascending: false });

      if (allStatsError) {
        console.error("Error fetching all referral stats:", allStatsError);
        return NextResponse.json({ error: "Failed to fetch all referral stats" }, { status: 500 });
      }

      if (allStats && allStats.length > 0) {
        // Update rank for the referrer
        const referrerIndex = allStats.findIndex((stat: any) => stat.user_id === referrerProfile.id);
        if (referrerIndex !== -1) {
          const { error: rankError } = await supabaseAdmin
            .from("referral_stats")
            .update({
              rank: referrerIndex + 1,
              total_users: allStats.length
            })
            .eq("user_id", referrerProfile.id);

          if (rankError) {
            console.error(`Error updating rank for user ${referrerProfile.id}:`, rankError);
            return NextResponse.json({ error: "Failed to update rank" }, { status: 500 });
          }
        }
      }
    } catch (rankError) {
      console.error("Error updating leaderboard rankings:", rankError);
      return NextResponse.json({ error: "Failed to update leaderboard rankings" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Referral stats updated successfully",
      referrerId: referrerProfile.id,
      totalReferrals: newReferralCount,
      tier,
      nextTier,
      totalEarnings
    });
  } catch (error: any) {
    console.error("Error processing referral stats:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 });
  }
}
