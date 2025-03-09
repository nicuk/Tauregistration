"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, TrendingUp } from "lucide-react"

interface TotalEarningsProps {
  claimed: number
  pending: number
  total: number
  unlockedPercentage: number
}

export function TotalEarningsCard({ claimed, pending, total, unlockedPercentage }: TotalEarningsProps) {
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
          <div className="text-3xl font-bold text-white">{total.toLocaleString()} TAU</div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2D3748] rounded-lg p-3">
              <p className="text-sm text-[#A0A8C0]">Unlocked</p>
              <p className="text-lg font-semibold text-white">{claimed.toLocaleString()} TAU</p>
            </div>
            <div className="bg-[#2D3748] rounded-lg p-3">
              <p className="text-sm text-[#A0A8C0]">Pending</p>
              <p className="text-lg font-semibold text-white">{pending.toLocaleString()} TAU</p>
            </div>
          </div>

          <div className="flex items-center text-[#3B82F6] text-sm">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span>{unlockedPercentage}% rewards unlocked</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

