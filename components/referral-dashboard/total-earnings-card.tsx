"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, TrendingUp, Unlock, Clock, Award, Users } from "lucide-react"

interface TotalEarningsProps {
  totalEarnings: number
  unlockedEarnings: number
  pendingEarnings: number
  unlockedPercentage: number
  milestoneRewards?: number
  referralRewards?: number
}

export function TotalEarningsCard({ 
  totalEarnings, 
  unlockedEarnings, 
  pendingEarnings, 
  unlockedPercentage,
  milestoneRewards = 0,
  referralRewards = 0
}: TotalEarningsProps) {
  return (
    <Card className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Coins className="h-5 w-5" />
          <span>Total Earnings</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="text-3xl font-bold">{totalEarnings.toLocaleString()} TAU</div>

          {/* Reward Types */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center space-x-1 mb-1">
                <Award className="h-4 w-4 text-yellow-300" />
                <p className="text-sm opacity-70">Milestone Rewards</p>
              </div>
              <p className="text-lg font-semibold">{milestoneRewards.toLocaleString()} TAU</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center space-x-1 mb-1">
                <Users className="h-4 w-4 text-blue-300" />
                <p className="text-sm opacity-70">Referral Rewards</p>
              </div>
              <p className="text-lg font-semibold">{referralRewards.toLocaleString()} TAU</p>
            </div>
          </div>

          {/* Unlocked vs Pending */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center space-x-1 mb-1">
                <Unlock className="h-4 w-4 text-green-300" />
                <p className="text-sm opacity-70">Unlocked</p>
              </div>
              <p className="text-lg font-semibold">{unlockedEarnings.toLocaleString()} TAU</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center space-x-1 mb-1">
                <Clock className="h-4 w-4 text-amber-300" />
                <p className="text-sm opacity-70">Pending</p>
              </div>
              <p className="text-lg font-semibold">{pendingEarnings.toLocaleString()} TAU</p>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Unlocked Percentage</span>
              <span>{unlockedPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${unlockedPercentage}%` }}
                className="h-full bg-green-400 rounded-full"
              />
            </div>
            <div className="flex items-center text-green-400 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>Each verification step unlocks 20% of rewards</span>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
}
