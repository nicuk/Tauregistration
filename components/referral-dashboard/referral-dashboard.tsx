"use client"

import { motion } from "framer-motion"
import { ReferralStats } from "./referral-stats"
import { MilestoneTracker } from "./milestone-tracker"
import { Leaderboard } from "./leaderboard"
import { Card } from "@/components/ui/card"

const milestones = [
  { tier: 1, reward: 10000, required: 1 },
  { tier: 2, reward: 25000, required: 3 },
  { tier: 3, reward: 45000, required: 6 },
  { tier: 4, reward: 100000, required: 12 },
  { tier: 5, reward: 250000, required: 25 },
  { tier: 6, reward: 500000, required: 50 },
  { tier: 7, reward: 1000000, required: 100 },
]

export interface ReferralData {
  totalReferrals: number
  completedVerifications: number
  currentTier: number
  rank?: number
  totalReferrers?: number
}

interface ReferralDashboardProps {
  data: ReferralData
}

export function ReferralDashboard({ data }: ReferralDashboardProps) {
  const currentMilestone = milestones.find((m) => m.required > data.totalReferrals) || milestones[milestones.length - 1]
  const prevMilestone = milestones[milestones.indexOf(currentMilestone) - 1]
  const progress = prevMilestone
    ? ((data.totalReferrals - prevMilestone.required) / (currentMilestone.required - prevMilestone.required)) * 100
    : (data.totalReferrals / currentMilestone.required) * 100

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <ReferralStats
          totalReferrals={data.totalReferrals}
          completedVerifications={data.completedVerifications}
          rank={data.rank}
          totalReferrers={data.totalReferrers}
        />
        <Card className="overflow-hidden">
          <Leaderboard rank={data.rank} totalReferrers={data.totalReferrers} />
        </Card>
      </div>

      <MilestoneTracker milestones={milestones} currentReferrals={data.totalReferrals} progress={progress} />
    </motion.div>
  )
}

