"use client"

import { motion } from "framer-motion"
import { CheckCircle } from "lucide-react"

interface VerificationSuccessStateProps {
  type: "twitter" | "telegram"
  handle: string
  reward: number
  verifiedAt: string
}

export function VerificationSuccessState({ type, handle, reward, verifiedAt }: VerificationSuccessStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-50 rounded-lg p-6 border border-green-100"
    >
      <div className="flex items-center space-x-3">
        <div className="rounded-full bg-green-100 p-2">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h4 className="font-semibold text-green-800">Successfully Verified!</h4>
          <p className="text-sm text-green-600">
            {type === "twitter" ? "@" : ""}
            {handle}
          </p>
        </div>
      </div>

      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-4 text-center bg-green-100 rounded-lg p-3"
      >
        <p className="text-sm text-green-600">Reward Claimed</p>
        <p className="text-lg font-bold text-green-700">{reward.toLocaleString()} TAU</p>
      </motion.div>

      <p className="text-xs text-green-500 mt-3">
        Verified on {verifiedAt ? (isNaN(Date.parse(verifiedAt)) ? "Recently" : new Date(verifiedAt).toLocaleDateString()) : "Recently"}
      </p>
    </motion.div>
  )
}
