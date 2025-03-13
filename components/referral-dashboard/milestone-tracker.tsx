"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy, ChevronRight } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Milestone {
  tier: number
  reward: number
  required: number
}

interface MilestoneTrackerProps {
  milestones: Milestone[]
  currentReferrals: number
  progress: number
}

export function MilestoneTracker({ milestones, currentReferrals, progress }: MilestoneTrackerProps) {
  // Find the next milestone based on current referrals
  const nextMilestone = milestones.find((m) => m.required > currentReferrals) || milestones[milestones.length - 1]
  const currentMilestone = milestones.find(
    (m) => m.required <= currentReferrals && currentReferrals < (nextMilestone?.required || Number.POSITIVE_INFINITY),
  )

  // Calculate progress to next milestone
  const progressToNext =
    currentMilestone === undefined ? 0 :
    nextMilestone.required === currentMilestone.required ? 100 :
    currentReferrals > 0 && currentMilestone.tier === 1 ? 100 :
    ((currentReferrals - (currentMilestone?.required || 0)) /
      (nextMilestone.required - (currentMilestone?.required || 0))) *
    100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Milestone Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to Next Milestone</span>
            <span className="tabular-nums font-medium">
              {currentReferrals} / {nextMilestone.required} referrals
            </span>
          </div>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Progress value={progressToNext} className="h-2 w-full bg-primary/20" />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {milestones.map((milestone, index) => (
            <TooltipProvider key={milestone.tier}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className={`group relative cursor-pointer transition-all hover:scale-105 ${
                        currentReferrals >= milestone.required
                          ? "border-green-500 bg-green-50"
                          : milestone === currentMilestone
                            ? "border-primary bg-primary/5"
                            : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Trophy
                              className={`h-5 w-5 ${
                                currentReferrals >= milestone.required ? "text-green-500" : "text-primary"
                              }`}
                            />
                            <span className="font-medium">Tier {milestone.tier}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                        <div className="mt-2 text-right">
                          <div className="text-xs text-muted-foreground">{milestone.required} referrals</div>
                          <div className="text-lg font-bold tabular-nums">{milestone.reward.toLocaleString()} TAU</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>
                    {currentReferrals >= milestone.required
                      ? "Milestone achieved! 🎉"
                      : `${milestone.required - currentReferrals} more referrals needed`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
