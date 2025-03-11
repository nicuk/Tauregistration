"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Trophy, Medal } from "lucide-react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientSupabaseClient } from "@/lib/supabase-client"

interface LeaderboardProps {
  rank?: number
  totalReferrers?: number
  topReferrers?: Array<{
    id?: string
    username: string
    referrals: number
    earnings?: number
  }>
  fetchGlobalLeaderboard?: boolean
}

export function Leaderboard({ rank, totalReferrers, topReferrers = [], fetchGlobalLeaderboard = false }: LeaderboardProps) {
  const [globalTopReferrers, setGlobalTopReferrers] = useState(topReferrers)
  const supabase = createClientSupabaseClient()
  
  useEffect(() => {
    if (fetchGlobalLeaderboard) {
      fetchGlobalLeaderboardData()
    } else {
      setGlobalTopReferrers(topReferrers)
    }
  }, [fetchGlobalLeaderboard, topReferrers])
  
  const fetchGlobalLeaderboardData = async () => {
    try {
      // Get top referrers with usernames - this ensures all users see the same data
      const { data: topReferrers, error: topReferrersError } = await supabase
        .from("referral_stats")
        .select("user_id, total_referrals, total_earnings, unlocked_rewards")
        .order("total_referrals", { ascending: false })
        .limit(10)

      if (topReferrersError) {
        console.error("Error fetching top referrers:", topReferrersError)
        return
      }

      // Get usernames for top referrers
      if (topReferrers && topReferrers.length > 0) {
        const userIds = topReferrers.map((referrer) => referrer.user_id)
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", userIds)

        if (profilesError) {
          console.error("Error fetching profiles for top referrers:", profilesError)
          return
        }

        if (profiles) {
          const processedReferrers = topReferrers.map((referrer) => {
            const profile = profiles.find((p) => p.id === referrer.user_id)
            return {
              id: referrer.user_id,
              username: profile?.username || "Anonymous",
              referrals: referrer.total_referrals,
              earnings: referrer.total_earnings || referrer.unlocked_rewards || 0
            }
          })
          
          setGlobalTopReferrers(processedReferrers)
        }
      }
    } catch (error) {
      console.error("Error in fetchGlobalLeaderboardData:", error)
    }
  }

  return (
    <>
      <CardHeader className="bg-primary/5">
        <CardTitle className="text-lg font-semibold">Top Referrers</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {globalTopReferrers.length > 0 ? (
            globalTopReferrers.map((referrer, index) => (
              <motion.div
                key={referrer.id || referrer.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center space-x-3">
                  {index === 0 ? (
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  ) : index === 1 ? (
                    <Medal className="h-5 w-5 text-gray-400" />
                  ) : index === 2 ? (
                    <Medal className="h-5 w-5 text-amber-600" />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center font-medium text-muted-foreground">
                      {index + 1}
                    </div>
                  )}
                  <span className="font-medium">{referrer.username}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="tabular-nums text-primary">{referrer.referrals} referrals</span>
                  <span className="text-sm text-muted-foreground">{(referrer.earnings || 0).toLocaleString()} TAU</span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">No referrers yet</div>
          )}
        </div>
      </CardContent>
    </>
  )
}
