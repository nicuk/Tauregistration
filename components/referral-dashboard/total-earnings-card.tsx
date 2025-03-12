"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useState } from "react"
import { ChevronDown, CircleDollarSign, Coins, Gem } from "lucide-react"

interface TotalEarningsCardProps {
  totalEarnings: number
  pendingRewards: number
  milestoneRewards: number
  referralRewards: number
  className?: string
}

export function TotalEarningsCard({
  totalEarnings,
  pendingRewards,
  milestoneRewards,
  referralRewards,
  className,
}: TotalEarningsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-primary" />
            Total Earnings
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded ? "rotate-180" : ""
              )}
            />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalEarnings.toLocaleString()} TAU</div>
        <p className="text-xs text-muted-foreground mt-1">
          Pending: {pendingRewards.toLocaleString()} TAU
        </p>

        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Gem className="h-4 w-4 text-blue-500" />
                <span>Milestone Rewards</span>
              </div>
              <span>{milestoneRewards.toLocaleString()} TAU</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span>Referral Rewards</span>
              </div>
              <span>{referralRewards.toLocaleString()} TAU</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              <p>Each verification step is worth 1,000 TAU per referral.</p>
              <p>Milestone rewards are earned based on your tier level.</p>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
}
