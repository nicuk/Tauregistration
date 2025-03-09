"use client"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"

interface RewardBreakdown {
  action: string
  amount: number
  percentage: number
}

interface RewardTooltipProps {
  isOpen: boolean
  onClose: () => void
  rewards: RewardBreakdown[]
}

export function RewardTooltip({ isOpen, onClose, rewards }: RewardTooltipProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute z-50 w-80 transform -translate-x-full"
        >
          <Card className="bg-gray-900 border-gray-800 shadow-xl">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">How to earn 34,000 TAU:</h3>
              <div className="space-y-3">
                {rewards.map((reward, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">{reward.action}:</span>
                    <div className="text-right">
                      <span className="text-white font-medium">{reward.amount.toLocaleString()} TAU</span>
                      <span className="text-gray-400 ml-1">({reward.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

