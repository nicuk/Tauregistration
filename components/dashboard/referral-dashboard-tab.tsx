"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trophy, Share2, Copy, Twitter } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { TotalEarningsCard } from "./total-earnings-card"
import { TierCard } from "./tier-card"
import { toast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"

const TIERS = [
  { tier: 1, reward: 10000, required: 1, badgeTitle: "Community Founder" },
  { tier: 2, reward: 25000, required: 3, badgeTitle: "Trusted Guide" },
  { tier: 3, reward: 45000, required: 6, badgeTitle: "Community Leader" },
  { tier: 4, reward: 100000, required: 12, badgeTitle: "Network Champion" },
  { tier: 5, reward: 250000, required: 25, badgeTitle: "TAU Ambassador" },
  { tier: 6, reward: 500000, required: 50, badgeTitle: "TAU Legend" },
  { tier: 7, reward: 1000000, required: 100, badgeTitle: "TAU Visionary" },
]

export function ReferralDashboardTab({ user, profile }) {
  const [stats, setStats] = useState({
    totalReferrals: 0,
    completedVerifications: 0,
    totalEarnings: 0,
    claimedRewards: 0,
    pendingRewards: 0,
    rank: 0,
    totalUsers: 0,
    topReferrers: [],
    referrals: [],
  })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchReferralStats()
  }, [])

  const fetchReferralStats = async () => {
    try {
      setLoading(true)

      // Fetch user's referral data
      const { data: referralData, error: referralError } = await supabase
        .from("referral_stats")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (referralError && referralError.code !== "PGRST116") {
        console.error("Error fetching referral stats:", referralError)
        return
      }

      // If no referral stats exist yet, use profile data
      const statsData = referralData || {
        total_referrals: profile.total_referrals || 0,
        total_earnings: profile.total_earnings || 0,
        claimed_rewards: profile.claimed_rewards || 0,
        pending_rewards: profile.pending_rewards || 0,
      }

      // Fetch user's referrals
      const { data: referrals, error: referralsError } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          email,
          twitter_verified,
          telegram_verified,
          twitter_shared,
          first_referral,
          created_at
        `)
        .eq("referred_by", profile.referral_code)

      if (referralsError) {
        console.error("Error fetching referrals:", referralsError)
        return
      }

      // Transform referrals data to match component expectations
      const transformedReferrals =
        referrals?.map((ref) => ({
          id: ref.id,
          name: ref.username,
          emailVerified: !!ref.email,
          twitterVerified: ref.twitter_verified,
          telegramVerified: ref.telegram_verified,
          twitterShared: ref.twitter_shared,
          firstReferralMade: ref.first_referral,
          joinedAt: ref.created_at,
        })) || []

      setStats({
        totalReferrals: statsData.total_referrals,
        completedVerifications: transformedReferrals.filter(
          (ref) => ref.emailVerified && ref.twitterVerified && ref.telegramVerified && ref.twitterShared,
        ).length,
        totalEarnings: statsData.total_earnings,
        claimedRewards: statsData.claimed_rewards,
        pendingRewards: statsData.pending_rewards,
        rank: statsData.rank || 0,
        totalUsers: statsData.total_users || 0,
        topReferrers: statsData.top_referrers || [],
        referrals: transformedReferrals,
      })
    } catch (error) {
      console.error("Error in fetchReferralStats:", error)
    } finally {
      setLoading(false)
    }
  }

  const referralLink = `https://taumine.vercel.app/register?ref=${profile.referral_code}`

  const handleShare = () => {
    const tweetText = `I just joined TAUMine as an early Pioneer! This AI-powered mining platform offers 3x rewards in the first week. Join me with referral code: ${profile.referral_code} #TAUMine #AITechnology #Web3 #TAUvsPI #EarlyPioneer`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, "_blank")
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard.",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const calculateVerificationProgress = () => {
    if (!stats.referrals || stats.referrals.length === 0) return 0
    const totalSteps = stats.referrals.length * 5
    const completedSteps = stats.referrals.reduce((acc, referral) => {
      return (
        acc +
        [
          referral.emailVerified,
          referral.twitterVerified,
          referral.telegramVerified,
          referral.twitterShared,
          referral.firstReferralMade,
        ].filter(Boolean).length
      )
    }, 0)
    return (completedSteps / totalSteps) * 100
  }

  const calculateReferralRewards = (referrals) => {
    return referrals.reduce((acc, ref) => {
      const steps = [
        ref.emailVerified,
        ref.twitterVerified,
        ref.telegramVerified,
        ref.twitterShared,
        ref.firstReferralMade,
      ].filter(Boolean).length;
      
      // Each step is worth 2,000 TAU
      return acc + (steps * 2000);
    }, 0);
  };

  const calculateMilestoneRewards = (referrals) => {
    // Count fully verified referrals
    const fullyVerifiedCount = referrals.reduce((acc, ref) => {
      const isFullyVerified = [
        ref.emailVerified,
        ref.twitterVerified,
        ref.telegramVerified,
        ref.twitterShared,
        ref.firstReferralMade,
      ].filter(Boolean).length === 5;

      return acc + (isFullyVerified ? 1 : 0);
    }, 0);
    
    // Calculate milestone rewards based on tiers
    let milestoneRewards = 0;
    
    // Check each tier and add the reward if the user has enough verified referrals
    for (const tier of TIERS) {
      if (fullyVerifiedCount >= tier.required) {
        milestoneRewards = tier.reward;
      } else {
        // Stop checking higher tiers if the current one isn't met
        break;
      }
    }
    
    return milestoneRewards;
  };

  const calculatePendingRewards = (referrals) => {
    return referrals.reduce((acc, ref) => {
      const completedSteps = [
        ref.emailVerified,
        ref.twitterVerified,
        ref.telegramVerified,
        ref.twitterShared,
        ref.firstReferralMade,
      ].filter(Boolean).length;
      
      // Each referral can earn up to 10,000 TAU (2,000 per step)
      const remainingPotential = (5 - completedSteps) * 2000;
      
      return acc + remainingPotential;
    }, 0);
  };

  if (loading) {
    return <div>Loading...</div>
  }

  const currentTier = TIERS.find((tier) => stats.totalReferrals < tier.required) || TIERS[TIERS.length - 1]
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1] || currentTier

  const referralRewards = calculateReferralRewards(stats.referrals);
  const milestoneRewards = calculateMilestoneRewards(stats.referrals);
  const totalEarnings = referralRewards + milestoneRewards;
  const pendingRewards = calculatePendingRewards(stats.referrals);
  const unlockedPercentage = stats.referrals.length > 0 
    ? Math.round((totalEarnings / (totalEarnings + pendingRewards)) * 100) 
    : 0;

  return (
    <div className="space-y-6 bg-[#0F1218] p-6">
      <TotalEarningsCard
        referralRewards={referralRewards}
        milestoneRewards={milestoneRewards}
        pending={pendingRewards}
        unlockedPercentage={unlockedPercentage}
      />

      {/* Share Section */}
      <Card className="bg-[#1A1F2B] border-none">
        <CardHeader>
          <CardTitle className="text-white">Share Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input value={referralLink} readOnly className="flex-grow bg-[#2D3748] text-white border-none" />
            <Button onClick={copyToClipboard} className="flex-shrink-0 bg-[#3B82F6] text-white hover:bg-[#2563EB]">
              {copied ? <Copy className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <Button onClick={handleShare} className="w-full bg-[#3B82F6] text-white hover:bg-[#2563EB]">
            <Twitter className="w-4 h-4 mr-2" />
            Share on Twitter
          </Button>
        </CardContent>
      </Card>

      {/* Referral Statistics */}
      <Card className="bg-[#1A1F2B] border-none">
        <CardHeader>
          <CardTitle className="text-white">Referral Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2D3748] p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-[#A0A8C0]">
                <Share2 className="h-4 w-4" />
                <span>Total Referrals</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-white">{stats.totalReferrals}</p>
            </div>
            <div className="bg-[#2D3748] p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-[#A0A8C0]">
                <Trophy className="h-4 w-4" />
                <span>Your Rank</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-white">#{stats.rank}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Progress */}
      <Card className="bg-[#1A1F2B] border-none">
        <CardHeader>
          <CardTitle className="text-white">Verification Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center text-[#A0A8C0]">
            <span>Overall Progress</span>
            <span>{calculateVerificationProgress().toFixed(1)}%</span>
          </div>
          <Progress value={calculateVerificationProgress()} className="h-2" />
          <p className="text-sm text-[#A0A8C0]">
            {stats.referrals?.length || 0} referrals have completed {calculateVerificationProgress().toFixed(1)}% of all
            verification steps
          </p>
        </CardContent>
      </Card>

      {/* Referral Leaderboard */}
      <Card className="bg-[#1A1F2B] border-none">
        <CardHeader>
          <CardTitle className="text-white">Referral Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topReferrers &&
            stats.topReferrers.map((referrer, index) => (
              <div
                key={referrer.id}
                className="flex items-center justify-between p-4 border-b border-[#2D3748] last:border-0"
              >
                <div className="flex items-center space-x-3">
                  {index === 0 && <Trophy className="h-5 w-5 text-[#FFD700]" />}
                  <span className="font-medium text-white">{referrer.username}</span>
                  {referrer.badge && (
                    <span className="px-2 py-1 bg-[#2D3748] text-[#A0A8C0] text-xs rounded-full">{referrer.badge}</span>
                  )}
                </div>
                <span className="text-[#3B82F6]">{referrer.earnings.toLocaleString()} TAU</span>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Milestone Progress */}
      <Card className="bg-[#1A1F2B] border-none">
        <CardHeader>
          <CardTitle className="text-white">Milestone Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {TIERS.map((tier) => (
            <TierCard
              key={tier.tier}
              tier={tier}
              currentReferrals={stats.totalReferrals}
              isCurrentTier={tier === currentTier}
              isNextTier={tier === nextTier}
              referrals={stats.referrals || []}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
