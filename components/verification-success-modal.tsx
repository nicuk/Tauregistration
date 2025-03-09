"use client"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface VerificationSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  type: "twitter" | "telegram"
  reward: number
}

export function VerificationSuccessModal({ isOpen, onClose, type, reward }: VerificationSuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md px-4"
          >
            <Card className="bg-gradient-to-br from-indigo-900 to-purple-900 border-none shadow-xl">
              <CardHeader className="text-center pb-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.1,
                  }}
                  className="flex justify-center mb-4"
                >
                  <div className="rounded-full bg-green-500/20 p-3">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                </motion.div>
                <CardTitle className="text-2xl font-bold text-white">Verification Successful!</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4 pb-6">
                <p className="text-lg text-gray-200">{type === "twitter" ? "Twitter" : "Telegram"} Account Verified</p>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-sm text-gray-300 mb-2">You've earned</p>
                  <p className="text-3xl font-bold text-white">{reward.toLocaleString()} TAU</p>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <p className="text-sm text-gray-300">Pioneer status confirmed</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center pb-6">
                <Button onClick={onClose} className="bg-white text-indigo-900 hover:bg-white/90">
                  Continue
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

