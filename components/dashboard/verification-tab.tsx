"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trophy, ExternalLink, CheckCircle, Share2 } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { logError, wrapWithErrorHandler } from "@/utils/debug"
import { VerificationAlert } from "@/components/verification-alert"
import { VerificationSuccessModal } from "@/components/verification-success-modal"
import { VerificationWarning } from "@/components/verification-warning"
import { RewardTooltip } from "@/components/ui/reward-tooltip"
import { motion } from "framer-motion"

const TAU_TWITTER_URL = "https://x.com/tau_mine"
const TAU_TELEGRAM_URL = "https://t.me/TAUMine"

const TWITTER_SHARE_TEMPLATE = (referralCode: string, referralLink: string) =>
  `I just joined TAUMine as an early Pioneer! This AI-powered mining platform offers 3x rewards in the first week.

💎 Become a Genesis Pioneer and earn up to 17,000 TAU

Join me with my referral link: ${referralLink}

#TAUMine #AIMining #Web3 #TAUvsPI #EarlyPioneer`

interface VerificationTabProps {
  user: any
  profile: any
  pioneerNumber?: number
}

export function VerificationTab({ user, profile, pioneerNumber }: VerificationTabProps) {
  const [formState, setFormState] = useState({
    twitter: "",
    telegram: "",
  })
  const [errors, setErrors] = useState({
    twitter: "",
    telegram: "",
  })
  const [loading, setLoading] = useState({
    twitter: false,
    telegram: false,
    share: false,
  })
  const [copied, setCopied] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [verificationType, setVerificationType] = useState<"twitter" | "telegram">("twitter")
  const [showTooltip, setShowTooltip] = useState(false)

  const supabase = createClientSupabaseClient()

  const calculateProgress = useCallback(() => {
    let completed = 0
    if (profile.twitter_verified) completed++
    if (profile.telegram_verified) completed++
    if (profile.twitter_shared) completed++
    if (profile.first_referral) completed++
    return (completed / 4) * 100
  }, [profile])

  const handleInputChange = useCallback(
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormState((prev) => ({
        ...prev,
        [field]: e.target.value,
      }))
      setErrors((prev) => ({
        ...prev,
        [field]: "", // Corrected this line to use 'field' instead of 'type'
      }))
    },
    [],
  )

  const validateUrl = useCallback((type: string, url: string) => {
    const patterns = {
      twitter: /^https:\/\/(x\.com|twitter\.com)\/[a-zA-Z0-9_]{1,15}$/,
      telegram: /^https:\/\/t\.me\/[a-zA-Z0-9_]{5,32}$/,
    }
    return patterns[type].test(url)
  }, [])

  const handleVerify = wrapWithErrorHandler(async (type: string) => {
    const url = formState[type]
    if (!validateUrl(type, url)) {
      setErrors((prev) => ({
        ...prev,
        [type]: `Please enter a valid ${type} profile URL`,
      }))
      return
    }

    setLoading((prev) => ({ ...prev, [type]: true }))
    try {
      const username = url.split("/").pop()

      if (process.env.NODE_ENV === "development") {
        // Simulate verification in development mode
        console.log(`${type} verified for development user`)
        setFormState((prev) => ({ ...prev, [type]: "" }))

        // Update local storage to simulate database update
        const devModeUser = JSON.parse(localStorage.getItem("devModeUser") || "{}")
        devModeUser.user_metadata[`${type}_verified`] = true
        devModeUser.user_metadata[`${type}_handle`] = username
        devModeUser.user_metadata[`${type}_verified_at`] = new Date().toISOString()
        localStorage.setItem("devModeUser", JSON.stringify(devModeUser))

        // Refresh the page to reflect changes
        window.location.reload()
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const userId = userData.user?.id
      if (!userId) throw new Error("User ID not found")

      const { error } = await supabase
        .from("profiles")
        .update({
          [`${type}_verified`]: true,
          [`${type}_handle`]: username,
          [`${type}_verified_at`]: new Date().toISOString(),
        })
        .eq("id", userId)

      let success = true
      if (error) {
        success = false
        throw error
      }
      setFormState((prev) => ({ ...prev, [type]: "" }))
      if (success) {
        setVerificationType(type as "twitter" | "telegram")
        setShowSuccessModal(true)
      }
      window.location.reload()
    } catch (error) {
      logError(error as Error, { context: "VerificationTab.handleVerify", type, userId: user.id })
      setErrors((prev) => ({
        ...prev,
        [type]: "Verification failed. Please try again.",
      }))
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }))
    }
  }, "VerificationTab.handleVerify")

  const handleShare = useCallback(async () => {
    setLoading((prev) => ({ ...prev, share: true }))
    try {
      const referralLink = `https://taumine.vercel.app/register?ref=${profile.referral_code}`
      const tweetText = encodeURIComponent(TWITTER_SHARE_TEMPLATE(profile.referral_code, referralLink))
      window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank")

      if (process.env.NODE_ENV === "development") {
        // In development mode, update local storage
        const devModeUser = JSON.parse(localStorage.getItem("devModeUser") || "{}")
        devModeUser.user_metadata.twitter_shared = true
        localStorage.setItem("devModeUser", JSON.stringify(devModeUser))
        window.location.reload()
        return
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          twitter_shared: true,
          last_twitter_share: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      // Refresh the page to update the UI
      window.location.reload()
    } catch (error) {
      console.error("Error sharing on Twitter:", error)
      setErrors((prev) => ({ ...prev, share: "Sharing failed. Please try again." }))
    } finally {
      setLoading((prev) => ({ ...prev, share: false }))
    }
  }, [profile.referral_code, supabase, user.id])

  const copyToClipboard = useCallback(() => {
    const copyText = `https://taumine.vercel.app/register?ref=${profile.referral_code}`
    navigator.clipboard
      .writeText(copyText)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => console.error("Failed to copy: ", err))
  }, [profile.referral_code])

  const progress = calculateProgress()

  const REWARD_BREAKDOWN = [
    {
      action: "Twitter Follow & Verification",
      amount: 5000,
      percentage: 29.4,
    },
    {
      action: "Telegram Join & Verification",
      amount: 4000,
      percentage: 23.5,
    },
    {
      action: "Twitter Post with #TAUMine",
      amount: 3000,
      percentage: 17.6,
    },
    {
      action: "First Referral (who verifies email)",
      amount: 5000,
      percentage: 29.5,
    },
  ]

  const renderTwitterSuccess = () => (
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
          <p className="text-sm text-green-600">@{profile.twitter_handle}</p>
        </div>
      </div>

      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-4 text-center bg-green-100 rounded-lg p-3"
      >
        <p className="text-sm text-green-600">Reward Claimed</p>
        <p className="text-lg font-bold text-green-700">5,000 TAU</p>
      </motion.div>

      <p className="text-xs text-green-500 mt-3">
        Verified on {profile.twitter_verified_at ? (isNaN(Date.parse(profile.twitter_verified_at)) ? "Recently" : new Date(profile.twitter_verified_at).toLocaleDateString()) : "Recently"}
      </p>
    </motion.div>
  )

  const renderTelegramSuccess = () => (
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
          <p className="text-sm text-green-600">{profile.telegram_handle}</p>
        </div>
      </div>

      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-4 text-center bg-green-100 rounded-lg p-3"
      >
        <p className="text-sm text-green-600">Reward Claimed</p>
        <p className="text-lg font-bold text-green-700">4,000 TAU</p>
      </motion.div>

      <p className="text-xs text-green-500 mt-3">
        Verified on {profile.telegram_verified_at ? (isNaN(Date.parse(profile.telegram_verified_at)) ? "Recently" : new Date(profile.telegram_verified_at).toLocaleDateString()) : "Recently"}
      </p>
    </motion.div>
  )

  const renderTwitterVerification = () => {
    if (profile.twitter_verified) {
      return renderTwitterSuccess()
    }

    return (
      <>
        <p className="mb-4">Verify your Twitter account to earn 5,000 TAU</p>
        <VerificationWarning type="twitter" />
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>
            Follow{" "}
            <a
              href={TAU_TWITTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center"
            >
              @tau_mine on Twitter
              <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </li>
          <li>Enter your Twitter profile URL below</li>
          <li>Click 'Verify' to confirm</li>
        </ol>
        <div className="flex items-start space-x-2">
          <Input
            value={formState.twitter}
            onChange={handleInputChange("twitter")}
            placeholder="https://x.com/username"
            className="flex-1"
          />
          <Button
            onClick={() => handleVerify("twitter")}
            disabled={loading.twitter}
            className="bg-[#6c5ce7] hover:bg-[#6c5ce7]/90 text-white min-w-[100px]"
          >
            {loading.twitter ? "Verifying..." : "Verify"}
          </Button>
        </div>
        {errors.twitter && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.twitter}</AlertDescription>
          </Alert>
        )}
      </>
    )
  }

  const renderTelegramVerification = () => {
    if (profile.telegram_verified) {
      return renderTelegramSuccess()
    }

    return (
      <>
        <p className="mb-4">Verify your Telegram account to earn 4,000 TAU</p>
        <VerificationWarning type="telegram" />
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>
            Join the{" "}
            <a
              href={TAU_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center"
            >
              TAUMine Telegram group
              <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </li>
          <li>Enter your Telegram profile URL below</li>
          <li>Click 'Verify' to confirm</li>
        </ol>
        <div className="flex items-start space-x-2">
          <Input
            value={formState.telegram}
            onChange={handleInputChange("telegram")}
            placeholder="https://t.me/username"
            className="flex-1"
          />
          <Button
            onClick={() => handleVerify("telegram")}
            disabled={loading.telegram}
            className="bg-[#6c5ce7] hover:bg-[#6c5ce7]/90 text-white min-w-[100px]"
          >
            {loading.telegram ? "Verifying..." : "Verify"}
          </Button>
        </div>
        {errors.telegram && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.telegram}</AlertDescription>
          </Alert>
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <Card className="bg-[#4a1d96] text-white">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Verification Progress</h3>
              <span className="text-xl font-bold">{progress}% complete</span>
            </div>
            <Progress value={progress} className="h-2 bg-white/20" indicatorClassName="bg-white" />
            <div className="flex items-center space-x-2 text-yellow-400">
              <Trophy className="h-5 w-5" />
              <span>
                Pioneer # <span className="text-yellow-400 font-bold">{pioneerNumber?.toLocaleString() || "1"}</span> of
                10,000 Genesis Pioneers
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Thank you for joining as a Genesis Pioneer. Your journey to mining TAU cryptocurrency starts now! Follow these
          steps to maximize your rewards:
        </h2>

        {/* Email Verification Alert */}
        {!user.email_confirmed_at && <VerificationAlert email={user.email} userId={user.id} />}

        {/* Twitter Verification */}
        <Card className="bg-[#eef2ff] border-none">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">1. Twitter Verification (5,000 TAU)</h3>
            {renderTwitterVerification()}
          </CardContent>
        </Card>

        {/* Telegram Verification */}
        <Card className="bg-[#eef2ff] border-none">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">2. Telegram Verification (4,000 TAU)</h3>
            {renderTelegramVerification()}
          </CardContent>
        </Card>

        {/* Share on Twitter */}
        <Card className="bg-[#eef2ff] border-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">3. Share on Twitter (3,000 TAU)</h3>
              {profile.twitter_shared && (
                <span className="text-green-500 font-semibold flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Claimed!
                </span>
              )}
            </div>
            <p className="mb-4">Share about TAUMine on Twitter to earn 3,000 TAU</p>
            <p className="text-sm text-gray-600 mb-4">
              Your referral link will be automatically included in the tweet.
            </p>
            <Button
              onClick={handleShare}
              disabled={loading.share}
              className="bg-[#6c5ce7] hover:bg-[#6c5ce7]/90 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {loading.share ? "Sharing..." : "Share on Twitter"}
            </Button>
          </CardContent>
        </Card>

        {/* Referral Section */}
        <Card className="bg-[#fff5eb] border-none">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">4. First Referral Verification (5,000 TAU)</h3>
            <p className="mb-4">
              Earn 5,000 TAU when your first referral completes their email verification. Your referral code is:{" "}
              <span className="font-bold">{profile.referral_code}</span>
            </p>
            <div className="flex space-x-2 mb-4">
              <Input
                value={`https://taumine.vercel.app/register?ref=${profile.referral_code}`}
                readOnly
                className="flex-grow font-mono text-sm"
              />
              <Button onClick={copyToClipboard} className="bg-[#6c5ce7] hover:bg-[#6c5ce7]/90 text-white min-w-[100px]">
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
            {profile.first_referral ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700">
                  First referral completed! You've earned 5,000 TAU
                </AlertDescription>
              </Alert>
            ) : profile.completedVerifications > 0 ? (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-700">
                  You have {profile.completedVerifications} verified referrals! Keep sharing to earn more rewards.
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <RewardTooltip isOpen={showTooltip} onClose={() => setShowTooltip(false)} rewards={REWARD_BREAKDOWN} />
      <VerificationSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type={verificationType}
        reward={verificationType === "twitter" ? 5000 : 4000}
      />
    </div>
  )
}
