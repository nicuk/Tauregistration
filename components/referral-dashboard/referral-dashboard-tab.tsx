"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trophy, Share2, Info, Users } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { TotalEarningsCard } from "./total-earnings-card"
import QRCode from "qrcode.react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function ReferralDashboardTab({ user, profile }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchReferralStats()
  }, [])

  const fetchReferralStats = async () => {
    try {
      const { data, error } = await supabase.from("referral_stats").select("*").eq("user_id", user.id).single()

      if (error) throw error
      setStats(data)
    } catch (error) {
      console.error("Error fetching referral stats:", error)
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

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <TotalEarningsCard claimed={stats.claimed_rewards} pending={stats.pending_rewards} />

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
          <CardTitle>Next Milestone</CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.progress_to_next_tier}%` }}
            className="h-2 bg-indigo-600 rounded-full"
          />
          <p className="mt-4 text-center text-lg">
            Earn {stats.next_tier_reward.toLocaleString()} more TAU by referring {stats.referrals_needed} more friends
          </p>
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
              <p className="text-2xl font-bold mt-2">{stats.total_referrals}</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>Your Rank</span>
              </div>
              <p className="text-2xl font-bold mt-2">#{stats.rank}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.top_referrers.map((referrer, index) => (
            <motion.div
              key={referrer.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 border-b last:border-0"
            >
              <div className="flex items-center space-x-3">
                {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                <span className="font-medium">{referrer.username}</span>
                {referrer.badge && (
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">{referrer.badge}</span>
                )}
              </div>
              <span className="text-primary">{referrer.earnings.toLocaleString()} TAU</span>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

