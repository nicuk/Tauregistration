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
      .select("id, email, twitter_verified, telegram_verified, twitter_shared, first_referral, created_at")
      .eq("referred_by", profile.referral_code);

    if (referralsError) {
      console.error("Error fetching referrals:", referralsError);
      return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
    }

    // Calculate verification stats for each referral
    interface ReferralDetails {
      id: string;
      steps: boolean[];
      completedSteps: number;
      completionPercentage: number;
      unlockedTAU: number;
      created_at: string;
    }

    const referralDetails: ReferralDetails[] = referrals.map((ref: any) => {
      // Check which verification steps are completed
      const emailVerified = ref.email && ref.email.length > 0; // Assuming email presence means verified
      const steps = [
        emailVerified,                // Email verification (20%)
        ref.twitter_verified || false, // Twitter verification (20%)
        ref.telegram_verified || false, // Telegram verification (20%)
        ref.twitter_shared || false,   // Twitter sharing (20%)
        ref.first_referral || false    // First referral (20%)
      ];
      
      // Count completed steps
      const completedSteps = steps.filter(Boolean).length;
      
      // Calculate completion percentage and unlocked TAU
      const completionPercentage = (completedSteps / 5) * 100;
      const unlockedTAU = Math.round((completionPercentage / 100) * 10000);
      
      return {
        id: ref.id,
        steps,
        completedSteps,
        completionPercentage,
        unlockedTAU,
        created_at: ref.created_at
      };
    });

    // Count fully verified referrals (all 5 steps completed)
    const verifiedReferrals = referralDetails.filter((ref: ReferralDetails) => ref.completedSteps === 5).length;

    // Count partially verified referrals (at least one step completed)
    const activeReferrals = referralDetails.filter((ref: ReferralDetails) => ref.completedSteps > 0).length;

    // Calculate overall completion percentage across all referrals
    const overallCompletionPercentage = referralDetails.length > 0 
      ? referralDetails.reduce((sum: number, ref: ReferralDetails) => sum + ref.completionPercentage, 0) / referralDetails.length 
      : 0;

    // Calculate total unlocked TAU from all referrals
    const totalUnlockedTAU = referralDetails.reduce((sum: number, ref: ReferralDetails) => sum + ref.unlockedTAU, 0);

    // Determine current tier based on verified referral count
    const tiers = [
      { tier: 1, required: 1, name: "Community Founder", reward: 10000 },
      { tier: 2, required: 3, name: "Community Builder", reward: 25000 },
      { tier: 3, required: 6, name: "Community Leader", reward: 45000 },
      { tier: 4, required: 12, name: "Community Champion", reward: 100000 },
      { tier: 5, required: 25, name: "Community Visionary", reward: 250000 },
      { tier: 6, required: 50, name: "Community Luminary", reward: 500000 },
      { tier: 7, required: 100, name: "Community Legend", reward: 1000000 },
    ];

    // Use verified referrals for tier determination
    const currentTierIndex = tiers.findIndex((t) => t.required > verifiedReferrals);
    const tierIndex = currentTierIndex === -1 ? 6 : currentTierIndex - 1; // Adjust for zero-based index
    const currentTier = tierIndex >= 0 ? tierIndex + 1 : 0;
    const nextTier = currentTier < 7 ? currentTier + 1 : 7;

    // Get current and next tier data
    const currentTierData = currentTier > 0 ? tiers[currentTier - 1] : { tier: 0, required: 0, name: "", reward: 0 };
    const nextTierData = nextTier > 0 ? tiers[nextTier - 1] : currentTierData;

    // Calculate earnings based on tier
    const tierReward = currentTier > 0 ? currentTierData.reward : 0;
    const maxTierReward = tiers[6].reward; // Tier 7 reward (1,000,000 TAU)

    // Calculate unlocked percentage based on maximum possible reward
    const unlockedPercentage = (tierReward / maxTierReward) * 100;

    // Calculate progress to next tier
    const currentThreshold = currentTier > 0 ? currentTierData.required : 0;
    const nextThreshold = nextTier > 0 ? nextTierData.required : tiers[0].required;
    const progressToNextTier = ((verifiedReferrals - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

    // Calculate referrals needed for next tier
    const referralsNeeded = Math.max(0, nextThreshold - verifiedReferrals);

    // Calculate pending rewards (next tier reward - current tier reward)
    const pendingTierReward = nextTierData.reward - tierReward;

    // Calculate total pending rewards (tier progression + incomplete referrals)
    const incompleteTAU = referralDetails.reduce((sum: number, ref: ReferralDetails) => sum + (10000 - ref.unlockedTAU), 0);
    const pendingRewards = pendingTierReward + incompleteTAU;

    if (existingStats) {
      // Update existing stats
      const { error: updateStatsError } = await supabaseAdmin
        .from("referral_stats")
        .update({
          total_referrals: newReferralCount,
          active_referrals: activeReferrals,
          verified_referrals: verifiedReferrals,
          current_tier: currentTier,
          next_tier: nextTier,
          current_tier_progress: progressToNextTier,
          current_tier_name: currentTierData.name,
          next_tier_name: nextTierData.name,
          overall_completion_percentage: overallCompletionPercentage,
          total_earnings: tierReward,
          unlocked_percentage: unlockedPercentage,
          pending_rewards: pendingRewards,
          unlocked_rewards: tierReward + totalUnlockedTAU,
          referral_details: JSON.stringify(referralDetails),
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
          current_tier: currentTier,
          next_tier: nextTier,
          current_tier_progress: progressToNextTier,
          current_tier_name: currentTierData.name,
          next_tier_name: nextTierData.name,
          overall_completion_percentage: overallCompletionPercentage,
          total_earnings: tierReward,
          unlocked_percentage: unlockedPercentage,
          pending_rewards: pendingRewards,
          unlocked_rewards: tierReward + totalUnlockedTAU,
          referral_details: JSON.stringify(referralDetails),
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
      tier: currentTier,
      nextTier: nextTier,
      totalEarnings: tierReward,
      unlockedPercentage: unlockedPercentage,
      pendingRewards: pendingRewards,
      unlockedRewards: tierReward + totalUnlockedTAU,
      referralDetails: referralDetails,
    });
  } catch (error: any) {
    console.error("Error processing referral stats:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 });
  }
}
