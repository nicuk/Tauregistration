"use client"

import { motion } from "framer-motion"
import { Trophy, Medal } from "lucide-react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LeaderboardProps {
  rank?: number
  totalReferrers?: number
}

export function Leaderboard({ rank, totalReferrers }: LeaderboardProps) {
  const topReferrers = [
    { username: "cryptoking", referrals: 95 },
    { username: "blockchain_queen", referrals: 82 },
    { username: "tau_master", referrals: 76 },
    { username: "mining_pro", referrals: 71 },
    { username: "web3_guru", referrals: 68 },
  ]

  return (
    <>
      <CardHeader className="bg-primary/5">
        <CardTitle className="text-lg font-semibold">Top Referrers</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {topReferrers.map((referrer, index) => (
            <motion.div
              key={referrer.username}
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
              <span className="tabular-nums text-primary">{referrer.referrals} referrals</span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </>
  )
}

