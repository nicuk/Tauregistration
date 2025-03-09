"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy, ChevronDown, ChevronUp, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Referral {
  id: string
  name: string
  emailVerified: boolean
  twitterVerified: boolean
  telegramVerified: boolean
  twitterShared: boolean
  firstReferralMade: boolean
  joinedAt: string
}

interface TierCardProps {
  tier: {
    tier: number
    reward: number
    required: number
    badgeTitle: string
  }
  currentReferrals: number
  isCurrentTier: boolean
  isNextTier: boolean
  referrals: Referral[]
}

const tierColors = {
  1: "#CD7F32", // Bronze
  2: "#C0C0C0", // Silver
  3: "#FFD700", // Gold
  4: "#E5E4E2", // Platinum
  5: "#B9F2FF", // Diamond
  6: "#A020F0", // Amethyst
  7: "#50C878", // Emerald
}

export function TierCard({ tier, currentReferrals, isCurrentTier, isNextTier, referrals }: TierCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate completion metrics
  const fullyVerifiedReferrals = referrals.filter(
    (ref) =>
      ref.emailVerified && ref.twitterVerified && ref.telegramVerified && ref.twitterShared && ref.firstReferralMade,
  ).length

  const isFullyClaimed = fullyVerifiedReferrals >= tier.required
  const totalUnlockedTAU = referrals.reduce((acc, ref) => {
    const steps = [
      ref.emailVerified,
      ref.twitterVerified,
      ref.telegramVerified,
      ref.twitterShared,
      ref.firstReferralMade,
    ].filter(Boolean).length
    return acc + (steps / 5) * 10000
  }, 0)

  const progress = Math.min((fullyVerifiedReferrals / tier.required) * 100, 100)
  const remainingReferrals = Math.max(tier.required - fullyVerifiedReferrals, 0)

  const gradientIntensity = (tier.tier / 7) * 100
  const gradientStyle = {
    background: `linear-gradient(135deg, #1E2433 ${100 - gradientIntensity}%, #232A3B 100%)`,
  }

  return (
    <motion.div
      initial={false}
      animate={{ height: isExpanded ? "auto" : "fit-content" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <Card
        className={`relative overflow-hidden transition-all duration-300 ease-in-out
          ${isCurrentTier ? "ring-2 ring-[#3B82F6]" : ""}
          ${isNextTier ? "bg-[#1E2433]" : ""}`}
        style={{
          ...gradientStyle,
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: tierColors[tier.tier] }} />
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className={`h-6 w-6 ${isCurrentTier ? "text-[#FFD700]" : "text-[#A0A8C0]"}`} />
              <span className="font-bold text-lg text-white">Tier {tier.tier}</span>
              <span className="text-sm text-[#A0A8C0]">({tier.badgeTitle})</span>
            </div>
            {isCurrentTier && (
              <span className="bg-[#3B82F6] text-white text-xs font-semibold px-2 py-1 rounded-full">Current Tier</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-3xl font-bold text-white">{tier.reward.toLocaleString()} TAU</div>
            {isFullyClaimed && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                <CheckCircle className="w-4 h-4 mr-1" />
                Claimed
              </Badge>
            )}
            {!isFullyClaimed && totalUnlockedTAU > 0 && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                {Math.round((totalUnlockedTAU / tier.reward) * 100)}% Unlocked
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-[#A0A8C0]">
              <span>Progress</span>
              <span>
                {fullyVerifiedReferrals}/{tier.required} completed
              </span>
            </div>
            <Progress
              value={progress}
              className="h-2 bg-[#2D3748]"
              indicatorClassName="bg-gradient-to-r from-[#3B82F6] to-[#2563EB]"
            />
          </div>

          {remainingReferrals > 0 && (
            <p className="text-sm text-[#A0A8C0]">{remainingReferrals} more referrals to reach this tier</p>
          )}

          <motion.button
            className="w-full text-[#A0A8C0] flex items-center justify-center mt-2"
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isExpanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
          </motion.button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-4 pt-4"
              >
                <h4 className="text-white font-semibold mb-2">Referred Friends</h4>
                {referrals.map((referral) => {
                  const isFullyVerified =
                    referral.emailVerified &&
                    referral.twitterVerified &&
                    referral.telegramVerified &&
                    referral.twitterShared &&
                    referral.firstReferralMade

                  const completedSteps = [
                    referral.emailVerified,
                    referral.twitterVerified,
                    referral.telegramVerified,
                    referral.twitterShared,
                    referral.firstReferralMade,
                  ].filter(Boolean).length

                  const unlockedAmount = (completedSteps / 5) * 10000

                  return (
                    <div key={referral.id} className="bg-[#1A1F2B] p-4 rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center text-white font-semibold">
                            {referral.name.charAt(0)}
                          </div>
                          <span className="text-white">{referral.name}</span>
                          {isFullyVerified && (
                            <Badge className="bg-green-500/20 text-green-400">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-[#A0A8C0]">
                          {new Date(referral.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <Progress
                          value={(completedSteps / 5) * 100}
                          className={`h-2 ${isFullyVerified ? "bg-green-500/20" : "bg-[#2D3748]"}`}
                          indicatorClassName={isFullyVerified ? "bg-green-500" : "bg-[#3B82F6]"}
                        />
                        <div className="flex justify-between text-xs text-[#A0A8C0]">
                          <span>{(completedSteps / 5) * 100}% Complete</span>
                          <span>{unlockedAmount.toLocaleString()} TAU unlocked</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

