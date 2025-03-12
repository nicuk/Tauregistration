"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, TrendingUp } from "lucide-react"

interface TotalEarningsProps {
  referralRewards: number
  milestoneRewards: number
  pending: number
  unlockedPercentage: number
}

export function TotalEarningsCard({ referralRewards, milestoneRewards, pending, unlockedPercentage }: TotalEarningsProps) {
  const totalEarnings = referralRewards + milestoneRewards;
  
  return (
    <Card className="bg-gradient-to-br from-[#1E2433] to-[#232A3B] border-none">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Coins className="h-5 w-5" />
          <span>Total Earnings</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-3xl font-bold text-white">{totalEarnings.toLocaleString()} TAU</div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2D3748] rounded-lg p-3">
              <p className="text-sm text-[#A0A8C0]">Milestone Rewards</p>
              <p className="text-lg font-semibold text-white">{milestoneRewards.toLocaleString()} TAU</p>
            </div>
            <div className="bg-[#2D3748] rounded-lg p-3">
              <p className="text-sm text-[#A0A8C0]">Referral Rewards</p>
              <p className="text-lg font-semibold text-white">{referralRewards.toLocaleString()} TAU</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2D3748] rounded-lg p-3">
              <p className="text-sm text-[#A0A8C0]">Total Earnings</p>
              <p className="text-lg font-semibold text-white">{totalEarnings.toLocaleString()} TAU</p>
            </div>
            <div className="bg-[#2D3748] rounded-lg p-3">
              <p className="text-sm text-[#A0A8C0]">Pending</p>
              <p className="text-lg font-semibold text-white">{pending.toLocaleString()} TAU</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-[#A0A8C0] mb-1">Unlocked Percentage</p>
            <div className="w-full bg-[#1A202C] rounded-full h-2">
              <div 
                className="bg-[#3B82F6] h-2 rounded-full" 
                style={{ width: `${unlockedPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-[#3B82F6]">Each verification step unlocks 20% of rewards</span>
              <span className="text-xs text-white">{unlockedPercentage}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
