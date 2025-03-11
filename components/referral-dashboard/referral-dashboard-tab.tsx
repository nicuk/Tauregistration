"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Info, User, Users, Trophy, ChevronDown, ChevronUp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabase-client"
import { TotalEarningsCard } from "./total-earnings-card"
import { Leaderboard } from "./leaderboard"
import { User as SupabaseUser } from "@supabase/supabase-js"

// Define interfaces for TypeScript type safety
interface ReferralStats {
  user_id: string
  total_referrals: number
  verified_referrals: number
  active_referrals: number
  rank: number
  total_earnings: number
  claimed_rewards: number
  pending_rewards: number
  unlocked_rewards: number
  current_tier: number
  next_tier: number
  current_tier_progress: number
  current_tier_name: string
  next_tier_name: string
  overall_completion_percentage: number
  unlocked_percentage: number
  top_referrers: any[]
  progress_to_next_tier: number
  next_tier_reward: number
  referrals_needed: number
  total_users: number
  referral_details: string
  milestone_rewards?: number
  referral_rewards?: number
}

interface ReferredUser {
  id: string
  username: string
  completionPercentage: number
  unlockedTAU: number
  formattedDate: string
  email_verified: boolean
  twitter_verified: boolean
  telegram_verified: boolean
  twitter_shared: boolean
  first_referral: boolean
  steps: boolean[]
  created_at: string
}

interface TierInfo {
  tier: number
  required: number
  reward: number
  name: string
}

interface TopReferrer {
  user_id: string
  total_referrals: number
  unlocked_rewards: number | null
  total_earnings: number | null
}

export function ReferralDashboardTab({ user, profile }: { user: SupabaseUser; profile: any }) {
  const [stats, setStats] = useState<ReferralStats>({
    user_id: "",
    total_referrals: 0,
    verified_referrals: 0,
    active_referrals: 0,
    rank: 0,
    total_earnings: 0,
    claimed_rewards: 0,
    pending_rewards: 0,
    unlocked_rewards: 0,
    current_tier: 0,
    next_tier: 0,
    current_tier_progress: 0,
    current_tier_name: "",
    next_tier_name: "",
    overall_completion_percentage: 0,
    unlocked_percentage: 0,
    top_referrers: [],
    progress_to_next_tier: 0,
    next_tier_reward: 0,
    referrals_needed: 0,
    total_users: 0,
    referral_details: "",
    milestone_rewards: 0,
    referral_rewards: 0
  })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([])
  const [showReferredUsers, setShowReferredUsers] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchReferralStats()
    fetchReferredUsers()
  }, [])

  const calculateMilestoneRewards = (verifiedReferrals: number) => {
    // Determine current tier based on verified referrals
    const tiers = [
      { tier: 1, required: 1, reward: 10000, name: "Community Founder" },
      { tier: 2, required: 3, reward: 25000, name: "Community Builder" },
      { tier: 3, required: 6, reward: 45000, name: "Community Leader" },
      { tier: 4, required: 12, reward: 100000, name: "Community Champion" },
      { tier: 5, required: 25, reward: 250000, name: "Community Visionary" },
      { tier: 6, required: 50, reward: 500000, name: "Community Luminary" },
      { tier: 7, required: 100, reward: 1000000, name: "Community Legend" }
    ]
    
    // Find the highest tier the user has achieved
    const achievedTier = tiers.filter(tier => verifiedReferrals >= tier.required)
                             .sort((a, b) => b.tier - a.tier)[0]
    
    return achievedTier ? achievedTier.reward : 0
  }

  const calculateReferralRewards = (referredUsers: ReferredUser[]) => {
    // Each referral can earn up to 10,000 TAU (20% per verification step)
    return referredUsers.reduce((total, user) => {
      // Count completed steps
      const completedSteps = user.steps ? user.steps.filter(Boolean).length : 0
      
      // Each step is worth 20% of 10,000 TAU
      const userReward = completedSteps * 0.2 * 10000
      
      return total + userReward
    }, 0)
  }

  const fetchReferralStats = async () => {
    try {
      setLoading(true)
      
      // Get referral stats for this user
      const { data: statsData, error: statsError } = await supabase
        .from("referral_stats")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (statsError) {
        console.error("Error fetching referral stats:", statsError)
        
        // If no stats found, trigger sync to create them
        if (statsError.code === "PGRST116") {
          await syncReferralStats()
          return
        }
      }

      if (statsData) {
        // Get top referrers with usernames
        const { data: topReferrers, error: topReferrersError } = await supabase
          .from("referral_stats")
          .select("user_id, total_referrals, total_earnings, unlocked_rewards")
          .order("total_referrals", { ascending: false })
          .limit(10)

        if (topReferrersError) {
          console.error("Error fetching top referrers:", topReferrersError)
        }

        // Get usernames for top referrers
        let topReferrersWithUsernames = []
        if (topReferrers && topReferrers.length > 0) {
          const userIds = topReferrers.map((referrer: TopReferrer) => referrer.user_id)
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, username")
            .in("id", userIds)

          if (profilesError) {
            console.error("Error fetching profiles for top referrers:", profilesError)
          }

          if (profiles) {
            topReferrersWithUsernames = topReferrers.map((referrer: TopReferrer) => {
              const profile = profiles.find((p: { id: string, username: string }) => p.id === referrer.user_id)
              return {
                id: referrer.user_id,
                username: profile?.username || "Anonymous",
                referrals: referrer.total_referrals,
                earnings: referrer.total_earnings || referrer.unlocked_rewards || 0
              }
            })
          }
        }

        // Determine current tier and next tier
        const tiers = [
          { tier: 1, required: 1, reward: 10000, name: "Community Founder" },
          { tier: 2, required: 3, reward: 25000, name: "Community Builder" },
          { tier: 3, required: 6, reward: 45000, name: "Community Leader" },
          { tier: 4, required: 12, reward: 100000, name: "Community Champion" },
          { tier: 5, required: 25, reward: 250000, name: "Community Visionary" },
          { tier: 6, required: 50, reward: 500000, name: "Community Luminary" },
          { tier: 7, required: 100, reward: 1000000, name: "Community Legend" }
        ]

        // Use verified referrals for tier determination
        const verifiedReferrals = statsData.verified_referrals || 0
        const currentTierIndex = tiers.findIndex((t) => t.required > verifiedReferrals)
        const tierIndex = currentTierIndex === -1 ? 6 : currentTierIndex - 1
        const currentTier = tierIndex >= 0 ? tierIndex + 1 : 0
        const nextTier = currentTier < 7 ? currentTier + 1 : 7

        // Get current and next tier data
        const currentTierData = currentTier > 0 ? tiers[currentTier - 1] : { tier: 0, required: 0, name: "", reward: 0 }
        const nextTierData = nextTier > 0 ? tiers[nextTier - 1] : currentTierData

        // Calculate referrals needed for next tier
        const nextThreshold = nextTier > 0 ? nextTierData.required : tiers[0].required
        const referralsNeeded = Math.max(0, nextThreshold - verifiedReferrals)

        // Calculate milestone rewards
        const milestoneRewards = calculateMilestoneRewards(verifiedReferrals)

        // Calculate referral rewards
        const referralRewards = calculateReferralRewards(referredUsers)

        // Update stats state
        setStats({
          ...statsData,
          top_referrers: topReferrersWithUsernames,
          referrals_needed: referralsNeeded,
          current_tier_name: statsData.current_tier_name || currentTierData.name,
          next_tier_name: statsData.next_tier_name || nextTierData.name,
          milestone_rewards: milestoneRewards,
          referral_rewards: referralRewards
        })
      }
    } catch (error) {
      console.error("Error in fetchReferralStats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReferredUsers = async () => {
    try {
      // Get users referred by this user
      const { data: referrals, error: referralsError } = await supabase
        .from("profiles")
        .select("id, username, email, twitter_verified, telegram_verified, twitter_shared, first_referral, created_at")
        .eq("referred_by", profile.referral_code)
        .order("created_at", { ascending: false })

      if (referralsError) {
        console.error("Error fetching referred users:", referralsError)
        return
      }

      if (referrals && referrals.length > 0) {
        // Calculate completion percentage and unlocked TAU for each referral
        const processedReferrals = referrals.map((referral: any): ReferredUser => {
          // Check which verification steps are completed
          const emailVerified = referral.email && referral.email.length > 0
          const steps = [
            emailVerified,                // Email verification (20%)
            referral.twitter_verified || false, // Twitter verification (20%)
            referral.telegram_verified || false, // Telegram verification (20%)
            referral.twitter_shared || false,   // Twitter sharing (20%)
            referral.first_referral || false    // First referral (20%)
          ]
          
          // Count completed steps
          const completedSteps = steps.filter(Boolean).length
          
          // Calculate completion percentage and unlocked TAU (20% per step)
          const completionPercentage = (completedSteps / 5) * 100
          const unlockedTAU = Math.round((completionPercentage / 100) * 10000)
          
          return {
            ...referral,
            email_verified: emailVerified,
            steps,
            completionPercentage,
            unlockedTAU,
            formattedDate: new Date(referral.created_at).toLocaleDateString()
          }
        })
        
        setReferredUsers(processedReferrals)
      }
    } catch (error) {
      console.error("Error in fetchReferredUsers:", error)
    }
  }
  
  const syncReferralStats = async () => {
    try {
      setLoading(true)
      
      const response = await fetch("/api/sync-referral-for-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: user.id })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error syncing referral stats:", errorData)
        return
      }

      const data = await response.json()
      console.log("Referral stats synced:", data)
      
      // Fetch updated stats after sync
      await fetchReferralStats()
    } catch (error) {
      console.error("Error in syncReferralStats:", error)
    } finally {
      setLoading(false)
    }
  }

  const referralLink = `https://taumine.vercel.app/register?ref=${profile.referral_code}`

  const handleShare = () => {
    const tweetText = `I just joined TAUMine as an early Pioneer! This AI-powered mining platform offers 3x rewards in the first week.

💎 Become a Genesis Pioneer and earn up to 34,000 TAU

Join me with my referral link: ${referralLink}

#TAUMine #AITechnology #Web3 #TAUvsPI #EarlyPioneer`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, "_blank")
  }

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Total Earnings Card */}
      <TotalEarningsCard
        totalEarnings={stats.total_earnings}
        unlockedEarnings={stats.unlocked_rewards}
        pendingEarnings={stats.pending_rewards}
        unlockedPercentage={stats.unlocked_percentage}
        milestoneRewards={stats.milestone_rewards}
        referralRewards={stats.referral_rewards}
      />

      {/* Grid layout for stats and leaderboard */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Referral Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Referral Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Total Referrals</span>
                </div>
                <span className="tabular-nums text-lg font-semibold">{stats.total_referrals || 0}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Verified Referrals</span>
                </div>
                <span className="tabular-nums text-lg font-semibold">{stats.verified_referrals || 0}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">Your Rank</span>
                </div>
                <span className="tabular-nums text-lg font-semibold">
                  #{stats.rank || 0} of {stats.total_users || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Leaderboard */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Referral Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <Leaderboard 
              rank={stats.rank} 
              totalReferrers={stats.total_users} 
              topReferrers={stats.top_referrers}
            />
          </CardContent>
        </Card>
      </div>

      {/* Referral Link Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value={referralLink}
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                onClick={copyReferralLink}
                variant="primary"
                className="bg-primary text-white hover:bg-primary/90"
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Milestone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Milestone Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to Next Milestone</span>
              <span className="tabular-nums font-medium">
                {stats.total_referrals} / {stats.next_tier === 1 ? 1 : 
                  stats.next_tier === 2 ? 3 : 
                  stats.next_tier === 3 ? 6 : 
                  stats.next_tier === 4 ? 12 : 
                  stats.next_tier === 5 ? 25 : 
                  stats.next_tier === 6 ? 50 : 100} referrals
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.progress_to_next_tier}%` }}
                className="h-full bg-primary rounded-full"
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-medium">Current Tier</span>
              </div>
              <p className="text-lg font-semibold">Tier {stats.current_tier}: {stats.current_tier_name}</p>
            </div>
            
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-medium">Next Reward</span>
              </div>
              <p className="text-lg font-semibold">{stats.next_tier_reward.toLocaleString()} TAU</p>
            </div>
          </div>
          
          <p className="text-center text-lg">
            {stats.referrals_needed > 0 ? (
              <>
                {stats.referrals_needed} more verified {stats.referrals_needed === 1 ? 'referral' : 'referrals'} to reach Tier {stats.next_tier}: {stats.next_tier_name}
              </>
            ) : (
              <>Tier {stats.current_tier} completed! You've reached the highest milestone.</>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Referred Friends */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Referred Friends</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReferredUsers(!showReferredUsers)}
                className="h-8 px-2"
              >
                {showReferredUsers ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showReferredUsers && (
          <CardContent>
            {referredUsers.length > 0 ? (
              <div className="space-y-4">
                {referredUsers.map((user) => (
                  <div key={user.id} className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="bg-primary text-white rounded-full h-8 w-8 flex items-center justify-center mr-2">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{user.username || 'Anonymous'}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{user.formattedDate}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${user.completionPercentage}%` }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                    <div className="flex justify-between text-sm mb-3">
                      <span>{user.completionPercentage}% Complete</span>
                      <span>{user.unlockedTAU.toLocaleString()} TAU unlocked</span>
                    </div>
                    
                    {/* Verification Steps */}
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      <div className={`text-xs p-1 text-center rounded ${user.steps[0] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        Email
                      </div>
                      <div className={`text-xs p-1 text-center rounded ${user.steps[1] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        Twitter
                      </div>
                      <div className={`text-xs p-1 text-center rounded ${user.steps[2] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        Telegram
                      </div>
                      <div className={`text-xs p-1 text-center rounded ${user.steps[3] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        Share
                      </div>
                      <div className={`text-xs p-1 text-center rounded ${user.steps[4] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        Refer
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No referred users yet</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </motion.div>
  )
}
