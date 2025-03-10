"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trophy, Share2, Info, Users, ChevronDown, ChevronUp, User } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { TotalEarningsCard } from "./total-earnings-card"
import QRCode from "qrcode.react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define interfaces for TypeScript type safety
interface ReferralStats {
  user_id: string
  total_referrals: number
  verified_referrals: number
  rank: number
  total_earnings: number
  claimed_rewards: number
  pending_rewards: number
  current_tier: number
  next_tier: number
  current_tier_progress: number
  top_referrers: any[]
  progress_to_next_tier: number
  next_tier_reward: number
  referrals_needed: number
  total_users: number
  current_tier_name: string
  unlocked_percentage: number
}

interface ReferredUser {
  id: string
  username: string
  completionPercentage: number
  unlockedTAU: number
  formattedDate: string
  twitter_verified: boolean
  telegram_verified: boolean
  twitter_shared: boolean
  first_referral: boolean
  created_at: string
}

interface TierInfo {
  tier: number
  required: number
  reward: number
  name: string
}

export function ReferralDashboardTab({ user, profile }) {
  const [stats, setStats] = useState<ReferralStats>({
    total_referrals: 0,
    verified_referrals: 0,
    rank: 0,
    total_earnings: 0,
    claimed_rewards: 0,
    pending_rewards: 0,
    current_tier: 0,
    next_tier: 1,
    current_tier_progress: 0,
    top_referrers: [],
    progress_to_next_tier: 0,
    next_tier_reward: 10000,
    referrals_needed: 1,
    total_users: 0,
    current_tier_name: "",
    unlocked_percentage: 0
  })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([])
  const [showReferredUsers, setShowReferredUsers] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchReferralStats()
    fetchReferredUsers()
  }, [])

  const fetchReferralStats = async () => {
    try {
      setLoading(true)
      
      // Get the user's referral stats
      const { data, error } = await supabase.from("referral_stats").select("*").eq("user_id", user.id).single()
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching referral stats:", error)
        // If there's an error other than "not found", show it
        setErrorMessage(error.message)
        return
      }
      
      if (!data) {
        // If no stats found, call the sync API to create them
        await syncReferralStats()
        return
      }
      
      // Calculate progress to next tier
      const tiers: TierInfo[] = [
        { tier: 1, required: 1, reward: 10000, name: "Community Founder" },
        { tier: 2, required: 3, reward: 25000, name: "Community Builder" },
        { tier: 3, required: 6, reward: 45000, name: "Community Leader" },
        { tier: 4, required: 12, reward: 100000, name: "TAU Pioneer" },
        { tier: 5, required: 25, reward: 250000, name: "TAU Ambassador" },
        { tier: 6, required: 50, reward: 500000, name: "TAU Evangelist" },
        { tier: 7, required: 100, reward: 1000000, name: "TAU Legend" }
      ]
      
      // Use verified_referrals for tier calculation
      const currentTier = data.current_tier || 0
      const nextTier = data.next_tier || 1
      const nextTierData = tiers[nextTier - 1]
      const currentTierData = currentTier > 0 ? tiers[currentTier - 1] : { required: 0, reward: 0, name: "" }
      
      // Calculate progress percentage to next tier
      const progressToNextTier = data.current_tier_progress || 0
      
      // Calculate referrals needed for next tier
      const referralsNeeded = nextTierData.required - (data.verified_referrals || 0)
      
      // Get the reward for the next tier
      const nextTierReward = nextTierData.reward
      
      // Calculate unlocked percentage (current tier reward / max tier reward)
      const maxTierReward = tiers[6].reward // 1,000,000 TAU
      const currentTierReward = currentTierData.reward
      const unlockedPercentage = Math.round((currentTierReward / maxTierReward) * 100)
      
      // Get top referrers for the leaderboard
      const { data: topReferrers, error: topReferrersError } = await supabase
        .from("referral_stats")
        .select("user_id, total_referrals, rank")
        .order("total_referrals", { ascending: false })
        .limit(10)
      
      if (topReferrersError) {
        console.error("Error fetching top referrers:", topReferrersError)
      }
      
      const topReferrersWithUsernames: Array<{
        id: string;
        username: string;
        earnings: number;
        badge: string | null;
      }> = []
      
      if (topReferrers && topReferrers.length > 0) {
        for (const referrer of topReferrers) {
          const { data: userData, error: userError } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", referrer.user_id)
            .single()
            
          if (!userError && userData) {
            topReferrersWithUsernames.push({
              id: referrer.user_id,
              username: userData.username || 'Anonymous',
              earnings: referrer.total_referrals * 1000, // Simple calculation for display
              badge: referrer.rank <= 3 ? ['Genesis', 'Pioneer', 'Early Adopter'][referrer.rank - 1] : null
            })
          }
        }
      }
      
      setStats({
        ...data,
        progress_to_next_tier: progressToNextTier,
        next_tier_reward: nextTierReward,
        referrals_needed: referralsNeeded,
        top_referrers: topReferrersWithUsernames,
        current_tier_name: currentTierData.name || "",
        unlocked_percentage: unlockedPercentage
      })
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
        .select("id, username, twitter_verified, telegram_verified, twitter_shared, first_referral, created_at")
        .eq("referred_by", profile.referral_code)
        .order("created_at", { ascending: false })

      if (referralsError) {
        console.error("Error fetching referred users:", referralsError)
        return
      }

      if (referrals && referrals.length > 0) {
        // Calculate completion percentage and unlocked TAU for each referral
        const processedReferrals = referrals.map((referral: any): ReferredUser => {
          const stepsCompleted = [
            referral.twitter_verified,
            referral.telegram_verified,
            referral.twitter_shared,
            referral.first_referral
          ].filter(Boolean).length
          
          const completionPercentage = (stepsCompleted / 4) * 100
          const unlockedTAU = Math.round((completionPercentage / 100) * 10000)
          
          return {
            ...referral,
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
      // Call the sync-referral-for-user API to create/update stats
      const response = await fetch(`/api/sync-referral-for-user?userId=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        // Fetch the updated stats
        const { data, error } = await supabase.from("referral_stats").select("*").eq("user_id", user.id).single()
        
        if (!error && data) {
          setStats({
            ...data,
            progress_to_next_tier: 0,
            next_tier_reward: 10000,
            referrals_needed: 1,
            top_referrers: []
          })
        }
      } else {
        console.error("Failed to sync referral stats:", await response.text())
      }
    } catch (error) {
      console.error("Error syncing referral stats:", error)
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

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <TotalEarningsCard claimed={stats.claimed_rewards || 0} pending={stats.pending_rewards || 0} />

      {/* Share Section */}
      <Card>
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
              <Share2 className="mr-2 h-4 w-4" />
              Share on Twitter
            </Button>

            <div className="bg-white p-2 rounded-lg">
              <QRCode value={referralLink} size={100} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Milestone */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-semibold">{stats.current_tier_name}</span>
            </div>
            <p className="text-2xl font-bold">{stats.next_tier_reward.toLocaleString()} TAU</p>
            <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm inline-block mt-2">
              {stats.unlocked_percentage}% Unlocked
            </div>
          </div>
          
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress_to_next_tier}%` }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          
          <div className="mt-2 text-sm text-right">
            {stats.total_referrals || 0}/{stats.next_tier_reward === 10000 ? 1 : stats.next_tier_reward === 25000 ? 3 : stats.next_tier_reward === 45000 ? 6 : stats.next_tier_reward === 100000 ? 12 : stats.next_tier_reward === 250000 ? 25 : stats.next_tier_reward === 500000 ? 50 : 100} completed
          </div>
          
          <p className="mt-4 text-center text-lg">
            {stats.referrals_needed > 0 ? (
              <>
                {stats.referrals_needed} more {stats.referrals_needed === 1 ? 'referral' : 'referrals'} to reach this tier
              </>
            ) : (
              <>Tier completed!</>
            )}
          </p>
          
          <div 
            className="flex items-center justify-center mt-4 cursor-pointer" 
            onClick={() => setShowReferredUsers(!showReferredUsers)}
          >
            {showReferredUsers ? (
              <ChevronUp className="h-6 w-6 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          
          {showReferredUsers && (
            <div className="mt-6">
              <h3 className="font-semibold text-lg mb-4">Referred Friends</h3>
              {referredUsers.length > 0 ? (
                <div className="space-y-4">
                  {referredUsers.map((referral: ReferredUser) => (
                    <div key={referral.id} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="bg-primary text-white rounded-full h-8 w-8 flex items-center justify-center mr-2">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{referral.username || 'Anonymous'}</span>
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
                      <div className="flex justify-between text-sm">
                        <span>{referral.completionPercentage}% Complete</span>
                        <span>{referral.unlockedTAU.toLocaleString()} TAU unlocked</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No referrals yet. Share your link to invite friends!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Statistics */}
      <Card>
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
                    Verification progress shows the percentage of your referrals who have completed all verification
                    steps
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Total Referrals</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.total_referrals || 0}</p>
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
      <Card>
        <CardHeader>
          <CardTitle>Verification Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>Overall Progress</span>
              <span>{stats.verified_referrals && stats.total_referrals ? 
                ((stats.verified_referrals / stats.total_referrals) * 100).toFixed(1) : 
                "0.0"}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: `${stats.verified_referrals && stats.total_referrals ? 
                    ((stats.verified_referrals / stats.total_referrals) * 100) : 0}%` 
                }}
                className="h-full bg-primary rounded-full"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.verified_referrals || 0} referrals have completed {stats.verified_referrals && stats.total_referrals ? 
                ((stats.verified_referrals / stats.total_referrals) * 100).toFixed(1) : 
                "0.0"}% of all verification steps
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Referral Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.top_referrers && stats.top_referrers.length > 0 ? (
            stats.top_referrers.map((referrer, index) => (
              <motion.div
                key={referrer.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border-b last:border-0"
              >
                <div className="flex items-center space-x-3">
                  {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                  <span className="font-medium">{referrer.username || 'Anonymous'}</span>
                  {referrer.badge && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">{referrer.badge}</span>
                  )}
                </div>
                <span className="text-primary">{(referrer.earnings || 0).toLocaleString()} TAU</span>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No referrals data available yet. Be the first to climb the leaderboard!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
