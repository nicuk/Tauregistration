import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies })

  // Check if user is an admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all profiles with referral codes
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, referral_code")
      .not("referral_code", "is", null)

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }

    const updates = []
    const errors = []

    // For each profile with a referral code
    for (const profile of profiles) {
      try {
        // Count how many users were referred by this user
        const { data: referrals, error: referralsError } = await supabase
          .from("profiles")
          .select("id, email, twitter_verified, telegram_verified, twitter_shared, first_referral")
          .eq("referred_by", profile.referral_code)

        if (referralsError) {
          console.error(`Error fetching referrals for user ${profile.id}:`, referralsError)
          errors.push({ userId: profile.id, error: referralsError.message })
          continue
        }

        // Count completed verifications
        const completedVerifications = referrals.filter(
          (ref) => ref.email && ref.twitter_verified && ref.telegram_verified && ref.twitter_shared
        ).length

        // Get or create referral stats record
        const { data: existingStats, error: statsError } = await supabase
          .from("referral_stats")
          .select("*")
          .eq("user_id", profile.id)
          .single()

        if (statsError && statsError.code !== "PGRST116") {
          console.error(`Error fetching referral stats for user ${profile.id}:`, statsError)
          errors.push({ userId: profile.id, error: statsError.message })
          continue
        }

        // Determine current tier based on referral count
        const tiers = [
          { tier: 1, required: 1 },
          { tier: 2, required: 3 },
          { tier: 3, required: 6 },
          { tier: 4, required: 12 },
          { tier: 5, required: 25 },
          { tier: 6, required: 50 },
          { tier: 7, required: 100 },
        ]

        const totalReferrals = referrals.length
        const currentTier = tiers.findIndex((t) => t.required > totalReferrals)
        const tier = currentTier === -1 ? 7 : currentTier
        const nextTier = tier < 7 ? tier + 1 : 7

        // Calculate earnings based on tier
        const tierRewards = [10000, 25000, 45000, 100000, 250000, 500000, 1000000]
        const totalEarnings = tier > 0 ? tierRewards[tier - 1] : 0
        const pendingRewards = totalEarnings

        if (existingStats) {
          // Update existing stats
          const { error: updateError } = await supabase
            .from("referral_stats")
            .update({
              total_referrals: totalReferrals,
              verified_referrals: completedVerifications,
              current_tier: tier,
              next_tier: nextTier,
              total_earnings: totalEarnings,
              pending_rewards: pendingRewards,
              updated_at: new Date(),
            })
            .eq("user_id", profile.id)

          if (updateError) {
            console.error(`Error updating referral stats for user ${profile.id}:`, updateError)
            errors.push({ userId: profile.id, error: updateError.message })
          } else {
            updates.push(profile.id)
          }
        } else {
          // Create new stats record
          const { error: insertError } = await supabase.from("referral_stats").insert({
            user_id: profile.id,
            total_referrals: totalReferrals,
            active_referrals: totalReferrals,
            pending_referrals: 0,
            verified_referrals: completedVerifications,
            tier_1_referrals: totalReferrals >= 1 ? 1 : 0,
            tier_2_referrals: totalReferrals >= 3 ? 1 : 0,
            tier_3_referrals: totalReferrals >= 6 ? 1 : 0,
            tier_4_referrals: totalReferrals >= 12 ? 1 : 0,
            tier_5_referrals: totalReferrals >= 25 ? 1 : 0,
            tier_6_referrals: totalReferrals >= 50 ? 1 : 0,
            tier_7_referrals: totalReferrals >= 100 ? 1 : 0,
            current_tier: tier,
            next_tier: nextTier,
            current_tier_progress: 0,
            total_earnings: totalEarnings,
            claimed_rewards: 0,
            pending_rewards: pendingRewards,
          })

          if (insertError) {
            console.error(`Error creating referral stats for user ${profile.id}:`, insertError)
            errors.push({ userId: profile.id, error: insertError.message })
          } else {
            updates.push(profile.id)
          }
        }
      } catch (error) {
        console.error(`Unexpected error processing referrals for user ${profile.id}:`, error)
        errors.push({ userId: profile.id, error: "Unexpected error" })
      }
    }

    // Calculate and update leaderboard rankings
    try {
      const { data: allStats, error: allStatsError } = await supabase
        .from("referral_stats")
        .select("user_id, total_referrals")
        .order("total_referrals", { ascending: false })

      if (allStatsError) {
        console.error("Error fetching all referral stats:", allStatsError)
      } else {
        // Update rank for each user
        for (let i = 0; i < allStats.length; i++) {
          const { error: rankError } = await supabase
            .from("referral_stats")
            .update({ rank: i + 1, total_users: allStats.length })
            .eq("user_id", allStats[i].user_id)

          if (rankError) {
            console.error(`Error updating rank for user ${allStats[i].user_id}:`, rankError)
          }
        }
      }
    } catch (error) {
      console.error("Error updating leaderboard rankings:", error)
    }

    return NextResponse.json({
      updated: updates,
      errors,
      message: `Updated ${updates.length} referral stats, encountered ${errors.length} errors`,
    })
  } catch (error) {
    console.error("Error in sync-referrals:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

