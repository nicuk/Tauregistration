"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, TrendingUp, Unlock, Clock, Award, Users } from "lucide-react"

interface TotalEarningsProps {
  totalEarnings: number
  pendingRewards: number
  unlockedPercentage?: number
  milestoneRewards?: number
  referralRewards?: number
}

export function TotalEarningsCard({ 
  totalEarnings, 
  pendingRewards, 
  unlockedPercentage = 0,
  milestoneRewards = 0,
  referralRewards = 0
}: TotalEarningsProps) {
  // Debug the props received by this component
  console.log("TotalEarningsCard props:", {
    totalEarnings,
    pendingRewards,
    unlockedPercentage,
    milestoneRewards,
    referralRewards
  });

  // Ensure all values are numbers to prevent rendering errors
  const safeTotal = typeof totalEarnings === 'number' ? totalEarnings : 0;
  const safePending = typeof pendingRewards === 'number' ? pendingRewards : 0;
  const safeUnlocked = typeof unlockedPercentage === 'number' ? unlockedPercentage : 0;
  const safeMilestone = typeof milestoneRewards === 'number' ? milestoneRewards : 0;
  const safeReferral = typeof referralRewards === 'number' ? referralRewards : 0;

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
          <div className="text-3xl font-bold">{safeTotal.toLocaleString()} TAU</div>

          {/* Reward Types */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center space-x-1 mb-1">
                <Award className="h-4 w-4 text-yellow-300" />
                <p className="text-sm opacity-70">Milestone Rewards</p>
              </div>
              <p className="text-lg font-semibold">{safeMilestone.toLocaleString()} TAU</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center space-x-1 mb-1">
                <Users className="h-4 w-4 text-blue-300" />
                <p className="text-sm opacity-70">Referral Rewards</p>
              </div>
              <p className="text-lg font-semibold">{safeReferral.toLocaleString()} TAU</p>
            </div>
          </div>

          {/* Unlocked and Pending */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center space-x-1 mb-1">
                <Unlock className="h-4 w-4 text-green-300" />
                <p className="text-sm opacity-70">Total Earnings</p>
              </div>
              <p className="text-lg font-semibold">{safeTotal.toLocaleString()} TAU</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center space-x-1 mb-1">
                <Clock className="h-4 w-4 text-orange-300" />
                <p className="text-sm opacity-70">Pending</p>
              </div>
              <p className="text-lg font-semibold">{safePending.toLocaleString()} TAU</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-sm opacity-70">Unlocked Percentage</p>
              <p className="text-sm font-medium">{safeUnlocked.toFixed(1)}%</p>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${safeUnlocked}%` }}
                className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
              />
            </div>
            <p className="text-xs mt-1 opacity-60">Each verification step is worth 1,000 TAU</p>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
}
