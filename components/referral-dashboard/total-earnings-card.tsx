"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, TrendingUp } from "lucide-react"

interface TotalEarningsProps {
  claimed: number
  pending: number
}

export function TotalEarningsCard({ claimed, pending }: TotalEarningsProps) {
  const total = claimed + pending

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
          <div className="text-3xl font-bold">{total.toLocaleString()} TAU</div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm opacity-70">Claimed</p>
              <p className="text-lg font-semibold">{claimed.toLocaleString()} TAU</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm opacity-70">Pending</p>
              <p className="text-lg font-semibold">{pending.toLocaleString()} TAU</p>
            </div>
          </div>

          <div className="flex items-center text-green-400 text-sm">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span>+{((pending / total) * 100).toFixed(1)}% pending rewards</span>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
}

