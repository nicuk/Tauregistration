import { Progress } from "@/components/ui/progress"

export interface Referral {
  id: string
  name: string
  emailVerified: boolean
  twitterVerified: boolean
  telegramVerified: boolean
  twitterShared: boolean
  firstReferralMade: boolean
  joinedAt: string
}

interface ReferralProgressBarProps {
  referral: Referral
}

export function ReferralProgressBar({ referral }: ReferralProgressBarProps) {
  const steps = [
    referral.emailVerified,
    referral.twitterVerified,
    referral.telegramVerified,
    referral.twitterShared,
    referral.firstReferralMade,
  ]

  const completedSteps = steps.filter(Boolean).length
  const progress = (completedSteps / steps.length) * 100

  return (
    <div className="w-full space-y-1">
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between text-xs text-[#A0A8C0]">
        <span>{completedSteps * 20}%</span>
        <span>{(completedSteps * 2000).toLocaleString()} TAU unlocked</span>
      </div>
    </div>
  )
}

