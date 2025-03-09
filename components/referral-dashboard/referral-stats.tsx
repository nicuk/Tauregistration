"use client"

import { motion } from "framer-motion"
import { Trophy, Users, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface ReferralStatsProps {
  totalReferrals: number
  completedVerifications: number
  rank?: number
  totalReferrers?: number
}

export function ReferralStats({ totalReferrals, completedVerifications, rank, totalReferrers }: ReferralStatsProps) {
  const verificationProgress = (completedVerifications / totalReferrals) * 100

  return (
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
            <span className="tabular-nums text-lg font-semibold">{totalReferrals}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Completed Verifications</span>
            </div>
            <span className="tabular-nums text-lg font-semibold">{completedVerifications}</span>
          </div>

          {rank && totalReferrers && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium">Your Rank</span>
              </div>
              <span className="tabular-nums text-lg font-semibold">
                #{rank} of {totalReferrers}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Verification Progress</span>
            <span className="tabular-nums font-medium">{verificationProgress.toFixed(0)}%</span>
          </div>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Progress value={verificationProgress} className="h-2 w-full bg-primary/20" />
          </motion.div>
        </div>
      </CardContent>
    </Card>
  )
}

