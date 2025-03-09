import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle } from "lucide-react"

interface ReferredUser {
  id: string
  username: string
  emailVerified: boolean
  twitterVerified: boolean
  telegramVerified: boolean
  twitterShared: boolean
  firstReferralMade: boolean
}

interface ReferralProgressProps {
  referredUsers: ReferredUser[]
}

export function ReferralProgress({ referredUsers }: ReferralProgressProps) {
  const calculateUserProgress = (user: ReferredUser) => {
    let progress = 0
    if (user.emailVerified) progress += 20
    if (user.twitterVerified) progress += 20
    if (user.telegramVerified) progress += 20
    if (user.twitterShared) progress += 20
    if (user.firstReferralMade) progress += 20
    return progress
  }

  const calculateTotalReward = (user: ReferredUser) => {
    return (calculateUserProgress(user) / 100) * 10000
  }

  const ReferralItem = ({ label, completed }: { label: string; completed: boolean }) => (
    <div className="flex items-center space-x-2">
      {completed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
      <span className={completed ? "text-green-600" : "text-red-600"}>{label}</span>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referral Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {referredUsers.map((user) => (
          <div key={user.id} className="mb-4">
            <div className="flex justify-between mb-2">
              <span>{user.username}</span>
              <span>{calculateTotalReward(user).toLocaleString()} / 10,000 TAU</span>
            </div>
            <Progress value={calculateUserProgress(user)} className="h-2 mb-2" />
            <ReferralItem label="Email Verified (20%)" completed={user.emailVerified} />
            <ReferralItem label="Twitter Verified (20%)" completed={user.twitterVerified} />
            <ReferralItem label="Telegram Joined (20%)" completed={user.telegramVerified} />
            <ReferralItem label="Twitter Shared (20%)" completed={user.twitterShared} />
            <ReferralItem label="First Referral (20%)" completed={user.firstReferralMade} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

