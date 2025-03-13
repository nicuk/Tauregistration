"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Info, User, Users, Trophy, ChevronDown, ChevronUp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { TotalEarningsCard } from "./total-earnings-card"
import { Leaderboard } from "./leaderboard"
// @ts-ignore
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
  milestone_rewards: number
  referral_rewards: number
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

const cardBgStyle = "bg-[#F8FAFC]"

// Define milestone tiers
const TIERS = [
  { tier: 1, reward: 5000, required: 1, badgeTitle: "Community Founder" },
  { tier: 2, reward: 12500, required: 3, badgeTitle: "Trusted Guide" },
  { tier: 3, reward: 22500, required: 6, badgeTitle: "Community Leader" },
  { tier: 4, reward: 50000, required: 12, badgeTitle: "Network Champion" },
  { tier: 5, reward: 125000, required: 25, badgeTitle: "TAU Ambassador" },
  { tier: 6, reward: 250000, required: 50, badgeTitle: "TAU Legend" },
  { tier: 7, reward: 500000, required: 100, badgeTitle: "TAU Visionary" },
]

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
    next_tier: 1,
    current_tier_progress: 0,
    current_tier_name: "",
    next_tier_name: "",
    overall_completion_percentage: 0,
    unlocked_percentage: 0,
    top_referrers: [],
    progress_to_next_tier: 0,
    next_tier_reward: 5000,
    referrals_needed: 1,
    total_users: 0,
    referral_details: "",
    milestone_rewards: 0,
    referral_rewards: 0
  })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([])
  const [showReferredUsers, setShowReferredUsers] = useState(false)
  const [showNextMilestone, setShowNextMilestone] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchReferralStats()
    fetchReferredUsers()
  }, [])

  const calculateReferralRewards = (referrals: ReferredUser[]) => {
    return referrals.reduce((acc, ref) => {
      const steps = [
        ref.email_verified,
        ref.twitter_verified,
        ref.telegram_verified,
        ref.twitter_shared,
        ref.first_referral,
      ].filter(Boolean).length;
      
      // Each step is worth 1000 TAU
      return acc + (steps * 1000);
    }, 0);
  };

  const calculateMilestoneRewards = (verifiedReferrals: number) => {
    // Find the highest tier the user has achieved
    const achievedTiers = TIERS.filter(tier => verifiedReferrals >= tier.required);
    const highestTier = achievedTiers.length > 0 ? achievedTiers[achievedTiers.length - 1] : null;
    
    return highestTier ? highestTier.reward : 0;
  };

  const calculatePendingRewards = (referrals: ReferredUser[]) => {
    return referrals.reduce((acc, ref) => {
      const completedSteps = [
        ref.email_verified,
        ref.twitter_verified,
        ref.telegram_verified,
        ref.twitter_shared,
        ref.first_referral,
      ].filter(Boolean).length;
      
      // Each referral can earn up to 5,000 TAU (1,000 per step)
      const remainingPotential = (5 - completedSteps) * 1000;
      
      return acc + remainingPotential;
    }, 0);
  };

  const fetchReferralStats = async () => {
    try {
      setLoading(true)
      
      // Get referral stats for this user
      const { data: statsData, error: statsError } = await supabase
        .from("referral_stats")
        .select("*, profiles(username)")
        .eq("user_id", user?.id)
        .single()

      if (statsError) {
        console.error("Error fetching referral stats:", statsError)
        setErrorMessage("Failed to load referral stats. Please try again later.")
        return
      }

      // Get top referrers
      const { data: topReferrers, error: topReferrersError } = await supabase
        .from("referral_stats")
        .select("user_id, referral_rewards, verified_referrals, profiles(username)")
        .order("referral_rewards", { ascending: false })
        .limit(10)

      if (topReferrersError) {
        console.error("Error fetching top referrers:", topReferrersError)
      }

      // Map top referrers to include username
      const topReferrersWithUsernames = (topReferrers || []).map((referrer: any) => ({
        ...referrer,
        username: referrer.profiles?.username || "Anonymous",
      }))

      if (statsData) {
        // Calculate verified referrals
        const verifiedReferrals = statsData.verified_referrals || 0
        
        // Find current tier based on verified referrals
        const currentTierIndex = TIERS.findIndex((tier) => verifiedReferrals < tier.required)
        const currentTierData = currentTierIndex > 0 
          ? TIERS[currentTierIndex - 1] 
          : verifiedReferrals >= TIERS[TIERS.length - 1].required 
            ? TIERS[TIERS.length - 1] 
            : { tier: 0, required: 0, reward: 0, badgeTitle: "Pioneer" }
        
        // Find next tier
        const nextTierData = currentTierIndex >= 0 && currentTierIndex < TIERS.length 
          ? TIERS[currentTierIndex] 
          : TIERS[TIERS.length - 1]
        
        // Get required referrals for current and next tier
        const currentTierRequired = currentTierData.required
        const nextTierRequired = nextTierData.required
        
        // Calculate progress to next tier
        const progressToNextTier = currentTierIndex === TIERS.length - 1 
          ? 100 
          : Math.min(100, Math.floor(((verifiedReferrals - currentTierRequired) / (nextTierRequired - currentTierRequired)) * 100))
        
        // Calculate referrals needed for next tier
        const referralsNeeded = Math.max(0, nextTierRequired - verifiedReferrals)
        
        // Calculate milestone and referral rewards
        const milestoneRewards = calculateMilestoneRewards(verifiedReferrals)
        const referralRewards = calculateReferralRewards(referredUsers)
        
        // Calculate total earnings: referral rewards + milestone rewards
        const totalEarnings = statsData.referral_rewards + statsData.milestone_rewards
        
        // Calculate pending rewards
        const pendingRewards = statsData.pending_rewards || calculatePendingRewards(referredUsers)
        
        // Calculate unlocked percentage - if user has at least 1 verified referral, they've unlocked 100% of Tier 1
        const unlocked_percentage = verifiedReferrals > 0 ? 100 : 0
        
        // Calculate overall completion percentage across all referrals
        let overall_completion_percentage = 0;
        if (referredUsers.length > 0) {
          // If any referral is 100% complete, the overall progress should be 100%
          const hasFullyVerifiedReferral = referredUsers.some((ref: ReferredUser) => 
            ref.email_verified && 
            ref.twitter_verified && 
            ref.telegram_verified && 
            ref.twitter_shared && 
            ref.first_referral
          );
          
          if (hasFullyVerifiedReferral) {
            overall_completion_percentage = 100;
          } else {
            const totalSteps = referredUsers.reduce((total: number, ref: ReferredUser) => {
              return total + [
                ref.email_verified,
                ref.twitter_verified,
                ref.telegram_verified,
                ref.twitter_shared,
                ref.first_referral,
              ].filter(Boolean).length;
            }, 0);
            overall_completion_percentage = (totalSteps / (referredUsers.length * 5)) * 100;
          }
        }
        
        // Update stats state
        setStats({
          total_referrals: statsData.total_referrals || 0,
          verified_referrals: verifiedReferrals,
          active_referrals: statsData.active_referrals || 0,
          current_tier: currentTierData.tier,
          current_tier_name: currentTierData.badgeTitle,
          next_tier_name: nextTierData.badgeTitle,
          overall_completion_percentage: overall_completion_percentage,
          unlocked_percentage: unlocked_percentage,
          top_referrers: topReferrersWithUsernames,
          progress_to_next_tier: progressToNextTier,
          next_tier_reward: nextTierData.reward,
          referrals_needed: referralsNeeded,
          total_users: statsData.total_users || 0,
          referral_details: statsData.referral_details || "",
          milestone_rewards: statsData.milestone_rewards || milestoneRewards,
          referral_rewards: statsData.referral_rewards || referralRewards,
          total_earnings: statsData.total_earnings || (statsData.referral_rewards + statsData.milestone_rewards),
          pending_rewards: statsData.pending_rewards || pendingRewards
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
        .select("id, username, email, twitter_verified, telegram_verified, twitter_shared, first_referral, created_at, email_verified")
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
          const emailVerified = referral.email_verified || false
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
          const unlockedTAU = completedSteps * 1000 // 1,000 TAU per step
          
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    fetchReferralStats()
  }, [])

  // Calculate current and next tier data based on stats
  const currentTierData = TIERS.find(tier => tier.tier === stats.current_tier) || TIERS[0]
  const nextTierData = TIERS.find(tier => tier.tier === stats.next_tier) || null

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-8">
      <TotalEarningsCard
        totalEarnings={stats.total_earnings || 0}
        pendingRewards={stats.pending_rewards || 0}
        milestoneRewards={stats.milestone_rewards || 0}
        referralRewards={stats.referral_rewards || 0}
      />

      {/* Share Section */}
      <Card className={cardBgStyle}>
        <CardHeader>
          <CardTitle>Share Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input value={referralLink} readOnly />
            <Button onClick={copyToClipboard}>{copied ? "Copied!" : "Copy"}</Button>
          </div>

          <div className="flex space-x-4">
            <Button onClick={handleShare} className="flex-1">
              Share on Twitter
            </Button>

            <div className="bg-white p-2 rounded-lg">
              {/* Removed QRCode */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Milestone */}
      <Card className={cardBgStyle}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Milestone Progress</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNextMilestone(!showNextMilestone)}
          >
            {showNextMilestone ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-semibold">Tier {currentTierData.tier}: {stats.current_tier_name}</span>
            </div>
            <div className="text-2xl font-bold mb-2">{currentTierData.reward.toLocaleString()} TAU</div>
            <div className={`inline-block px-3 py-1 rounded-full text-xs ${stats.current_tier_progress === 100 ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
              {stats.current_tier_progress === 100 ? "100% of Maximum Reward Unlocked" : `${stats.current_tier_progress}% of Maximum Reward Unlocked`}
            </div>
            <div className="text-right text-sm text-gray-500 mt-2">
              {stats.verified_referrals}/{currentTierData.required} verified referrals
            </div>
          </div>

          <AnimatePresence>
            {showNextMilestone && nextTierData && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t pt-4 mt-4"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Trophy className="h-5 w-5 text-gray-400" />
                  <span className="font-semibold text-gray-700">Next: Tier {nextTierData.tier}: {stats.next_tier_name}</span>
                </div>
                <div className="text-2xl font-bold mb-2 text-gray-700">{nextTierData.reward.toLocaleString()} TAU</div>
                
                {/* Progress to next tier */}
                <div className="mt-4">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.current_tier_progress}%` }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                  <div className="text-center text-sm text-gray-500 mt-2">
                    {stats.referrals_needed} more verified referrals to reach Tier {nextTierData.tier}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Referral Statistics */}
      <Card className={cardBgStyle}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Referral Statistics</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Statistics show your total referrals, verified referrals, and current rank.
                    Verified referrals have completed all 5 verification steps.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Total Referrals</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.total_referrals || 0}</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-500" />
                <span>Verified</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.verified_referrals || 0}</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>Your Rank</span>
              </div>
              <p className="text-2xl font-bold mt-2">#{stats.rank || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Progress */}
      <Card className={cardBgStyle}>
        <CardHeader>
          <CardTitle>Verification Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>Overall Progress</span>
              <span>{stats.overall_completion_percentage ? 
                stats.overall_completion_percentage.toFixed(1) : 
                "0.0"}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: `${stats.overall_completion_percentage || 0}%` 
                }}
                className="h-full bg-primary rounded-full"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {referredUsers.length} referrals have completed an average of {stats.overall_completion_percentage ? 
                stats.overall_completion_percentage.toFixed(1) : 
                "0.0"}% of all verification steps
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Referral Leaderboard */}
      <Card className={cardBgStyle}>
        <CardContent className="p-0">
          <Leaderboard 
            fetchGlobalLeaderboard={true} // Ensure all users see the same global leaderboard
          />
        </CardContent>
      </Card>

      {/* Referred Users */}
      <Card className={cardBgStyle}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Referrals</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReferredUsers(!showReferredUsers)}
          >
            {showReferredUsers ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Show
              </>
            )}
          </Button>
        </CardHeader>
        {showReferredUsers && (
          <CardContent>
            {referredUsers.length > 0 ? (
              <div className="space-y-4">
                {referredUsers.map((referral) => (
                  <div key={referral.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="bg-primary text-white rounded-full h-8 w-8 flex items-center justify-center mr-2">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{referral.username}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{referral.formattedDate}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${referral.completionPercentage}%` }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                    <div className="flex justify-between text-sm mb-3">
                      <span>{referral.completionPercentage}% Complete</span>
                      <span>{referral.unlockedTAU?.toLocaleString() || 0} TAU unlocked</span>
                    </div>
                    
                    {/* Verification Steps */}
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      <div className={`text-xs p-1 text-center rounded ${referral.steps[0] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        Email
                      </div>
                      <div className={`text-xs p-1 text-center rounded ${referral.steps[1] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        Twitter
                      </div>
                      <div className={`text-xs p-1 text-center rounded ${referral.steps[2] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        Telegram
                      </div>
                      <div className={`text-xs p-1 text-center rounded ${referral.steps[3] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        Share
                      </div>
                      <div className={`text-xs p-1 text-center rounded ${referral.steps[4] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        Refer
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No referrals yet. Share your link to invite friends!</p>
            )}
          </CardContent>
        )}
      </Card>

    </div>
  )
}
