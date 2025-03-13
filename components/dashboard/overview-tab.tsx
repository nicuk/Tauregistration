"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { InfoIcon, Twitter, MessageCircle, AlertCircle, Trophy, Users, Share2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
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

export function OverviewTab({ user, profile, pioneerNumber }: OverviewTabProps) {
  const [resending, setResending] = useState(false)
  const [personalRewards, setPersonalRewards] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // Fetch personal rewards from the database
    const fetchPersonalRewards = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('referral_stats')
          .select('personal_rewards')
          .eq('user_id', user.id)
          .single()
        
        if (error) {
          console.error('Error fetching personal rewards:', error)
          // Fall back to local calculation if there's an error
          setPersonalRewards(calculateRewards())
        } else if (data) {
          setPersonalRewards(data.personal_rewards)
        } else {
          // If no data found, fall back to local calculation
          setPersonalRewards(calculateRewards())
        }
      } catch (error) {
        console.error('Error in personal rewards fetch:', error)
        setPersonalRewards(calculateRewards())
      } finally {
        setIsLoading(false)
      }
    }

    fetchPersonalRewards()
  }, [user.id, profile])

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

  // This function is kept as a fallback in case the database fetch fails
  function calculateRewards() {
    let total = 0
    if (profile.twitter_verified) total += 5000
    if (profile.telegram_verified) total += 4000
    if (profile.twitter_shared) total += 3000
    if (profile.first_referral) total += 5000
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
          <CardTitle className="flex items-center space-x-2">
            <span>General Progress</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="max-w-xs">Verify Your Email To Secure TAU Token</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Your Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "Loading..." : personalRewards.toLocaleString()} TAU</div>
            <p className="text-xs text-muted-foreground">out of 17,000 TAU</p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
                <div className="text-sm font-medium">Current Rewards</div>
                <div className="ml-auto font-medium">{isLoading ? "Loading..." : personalRewards.toLocaleString()} TAU</div>
              </div>
              <div className="flex items-center">
                <Trophy className="h-4 w-4 text-primary mr-2" />
                <div className="text-sm font-medium">Potential Rewards</div>
                <div className="ml-auto font-medium">17,000 TAU</div>
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
