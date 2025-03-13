import { useState, useEffect } from "react"
import { Trophy, Medal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Skeleton } from "@/components/ui/skeleton"

interface LeaderboardItem {
  user_id: string;
  username: string;
  verified_referrals: number;
  total_earnings: string;
  referral_rewards: number;
  milestone_rewards: number;
}

interface LeaderboardProps {
  rank?: number
  totalReferrers?: number
  topReferrers?: Array<{
    id?: string
    username: string
    referrals: number
    earnings?: number
    referralRewards?: number
  }>
  fetchGlobalLeaderboard?: boolean
  globalTopReferrers?: Array<{
    id?: string
    username: string
    referrals: number
    earnings?: number
    referralRewards?: number
  }>
  userId?: string
}

export function Leaderboard({ rank, totalReferrers, topReferrers = [], fetchGlobalLeaderboard = false, globalTopReferrers, userId }: LeaderboardProps) {
  const [globalTopReferrersState, setGlobalTopReferrers] = useState(globalTopReferrers || topReferrers)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // Always fetch global leaderboard data regardless of the prop
    fetchGlobalLeaderboardData()

    // Set up interval to refresh data every 60 seconds
    const interval = setInterval(() => {
      fetchGlobalLeaderboardData()
    }, 60000)

    // Clean up interval on component unmount
    return () => clearInterval(interval)
  }, [])

  const fetchGlobalLeaderboardData = async () => {
    try {
      console.log("Fetching global leaderboard data...")

      // Use the get_leaderboard() function instead of querying the view directly
      // This function has SECURITY DEFINER privileges to access the data
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .rpc('get_leaderboard')
        .limit(10)

      if (leaderboardError) {
        console.error("Error fetching leaderboard data:", leaderboardError)
        setError(leaderboardError.message || 'Failed to load leaderboard')
        setLoading(false)
        return
      }

      console.log("Fetched leaderboard data:", leaderboardData)

      if (leaderboardData && leaderboardData.length > 0) {
        const processedReferrers = leaderboardData.map((referrer: LeaderboardItem) => {
          return {
            id: referrer.user_id,
            username: referrer.username || "Anonymous",
            referrals: referrer.verified_referrals,
            referralRewards: referrer.referral_rewards || 0,
            earnings: parseFloat(referrer.total_earnings) || 0
          }
        })

        console.log("Processed referrers:", processedReferrers)
        setGlobalTopReferrers(processedReferrers)
        setError(null)
      }
      setLoading(false)
    } catch (err: any) {
      console.error("Error in fetchGlobalLeaderboardData:", err)
      setError(err.message || 'Failed to load leaderboard')
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  const getTrophyIcon = (position: number) => {
    if (position === 0) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (position === 1) return <Trophy className="h-5 w-5 text-gray-400" />
    if (position === 2) return <Trophy className="h-5 w-5 text-amber-700" />
    return null
  }

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : globalTopReferrersState.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No data available</div>
        ) : (
          <div className="space-y-2">
            {globalTopReferrersState.map((referrer, index) => (
              <div
                key={referrer.id}
                className={`flex items-center justify-between py-2 px-3 rounded-md ${
                  referrer.id === userId ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{index + 1}.</span>
                  {getTrophyIcon(index)}
                  <span className={`${referrer.id === userId ? "font-semibold" : ""}`}>
                    {referrer.username}
                  </span>
                  {referrer.id === userId && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </div>
                <div className="flex space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatNumber(referrer.earnings)} TAU</div>
                    <div className="text-xs text-gray-500">{referrer.referrals} verified referrals</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
