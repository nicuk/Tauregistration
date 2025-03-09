"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { InfoIcon, Twitter, MessageCircle, AlertCircle, Trophy, Users, Share2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { createClientSupabaseClient } from "@/utils/supabase-client"
import { EmailVerificationBox } from "@/components/dashboard/email-verification-box" // Import the missing component

interface OverviewTabProps {
  user: any
  profile: any
  pioneerNumber: number
}

const REWARD_BREAKDOWN = [
  {
    action: "Twitter Follow & Verification",
    amount: 10000,
    percentage: 29.4,
  },
  {
    action: "Telegram Join & Verification",
    amount: 8000,
    percentage: 23.5,
  },
  {
    action: "Twitter Post with #TAUMine",
    amount: 6000,
    percentage: 17.6,
  },
  {
    action: "First Referral (who verifies email)",
    amount: 10000,
    percentage: 29.5,
  },
]

export function OverviewTab({ user, profile, pioneerNumber }: OverviewTabProps) {
  const [resending, setResending] = useState(false)
  const supabase = createClientSupabaseClient()

  const handleResendEmail = async () => {
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      })
      if (error) throw error
      alert("Verification email sent!")
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setResending(false)
    }
  }

  const verificationSteps = [
    {
      icon: Twitter,
      label: "Twitter",
      done: profile.twitter_verified,
    },
    {
      icon: MessageCircle,
      label: "Telegram",
      done: profile.telegram_verified,
    },
    {
      icon: Share2,
      label: "Share Tweet",
      done: profile.twitter_shared,
    },
    {
      icon: Users,
      label: "1st Verified Ref",
      done: profile.first_referral || profile.completedVerifications > 0,
    },
  ]

  const calculateProgress = () => {
    let steps = 0
    if (profile.twitter_verified) steps++
    if (profile.telegram_verified) steps++
    if (profile.twitter_shared) steps++
    if (profile.first_referral || profile.completedVerifications > 0) steps++
    return (steps / 4) * 100
  }

  const progress = calculateProgress()
  const rewards = calculateRewards()

  function calculateRewards() {
    let total = 0
    if (profile.twitter_verified) total += 10000
    if (profile.telegram_verified) total += 8000
    if (profile.twitter_shared) total += 6000
    if (profile.first_referral) total += 10000
    return total
  }

  return (
    <div className="space-y-6">
      {!user.email_confirmed_at && <EmailVerificationBox email={user.email} />}

      {!user.email_confirmed_at && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-semibold">Email not verified</p>
                <p>Please check your inbox and verify your email to continue.</p>
              </div>
              <Button onClick={handleResendEmail} disabled={resending} variant="outline" size="sm">
                {resending ? "Sending..." : "Resend Email"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-[#eef2ff] border-none">
        <CardHeader>
          <CardTitle>General Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-2xl font-bold">{progress.toFixed(0)}%</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {verificationSteps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className={`rounded-full p-2 ${step.done ? "bg-green-500" : "bg-gray-300"}`}>
                  <step.icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm mt-2 text-center">{step.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#eef2ff] border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="w-80 p-4" side="left">
                  <p className="font-semibold mb-2">How to earn 34,000 TAU:</p>
                  <div className="space-y-2">
                    {REWARD_BREAKDOWN.map((reward, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{reward.action}:</span>
                        <span className="font-medium">
                          {reward.amount.toLocaleString()} TAU ({reward.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rewards.toLocaleString()} TAU</div>
            <p className="text-xs text-muted-foreground">out of 34,000 TAU</p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
                <div className="text-sm font-medium">Current Rewards</div>
                <div className="ml-auto font-medium">{rewards.toLocaleString()} TAU</div>
              </div>
              <div className="flex items-center">
                <Trophy className="h-4 w-4 text-primary mr-2" />
                <div className="text-sm font-medium">Potential Rewards</div>
                <div className="ml-auto font-medium">34,000 TAU</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#4a1d96] text-white">
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium">Pioneer Status</span>
              <span className="text-2xl font-bold">
                Pioneer # <span className="text-yellow-400">{pioneerNumber.toLocaleString()}</span>
              </span>
            </div>
            <div className="mt-4 flex items-center">
              <Users className="h-4 w-4 text-yellow-400 mr-2" />
              <span className="text-sm">of 10,000 Genesis Pioneers</span>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center rounded-full bg-yellow-400 px-2 py-1 text-xs font-medium text-[#4a1d96]">
                Genesis Pioneer
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

