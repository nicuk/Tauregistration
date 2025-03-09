import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { InfoIcon } from "lucide-react"

interface RewardProgressProps {
  twitterVerified: boolean
  telegramVerified: boolean
  twitterShared: boolean
  firstReferralMade: boolean
  totalRewards: number
}

export function RewardProgress({
  twitterVerified,
  telegramVerified,
  twitterShared,
  firstReferralMade,
  totalRewards,
}: RewardProgressProps) {
  const potentialRewards = 34000 // 10,000 + 8,000 + 6,000 + 10,000

  const RewardItem = ({ label, amount, completed }: { label: string; amount: number; completed: boolean }) => (
    <div className="flex justify-between items-center mb-2">
      <span>{label}</span>
      <span className="flex items-center">
        {completed ? (
          <span className="text-green-600 font-semibold">{amount.toLocaleString()} TAU</span>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center">
                <span className="text-gray-500">{amount.toLocaleString()} TAU</span>
                <InfoIcon className="ml-1 h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Pending - Claimable when the main app launches</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </span>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reward Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <RewardItem label="Twitter Verification" amount={10000} completed={twitterVerified} />
        <RewardItem label="Telegram Verification" amount={8000} completed={telegramVerified} />
        <RewardItem label="Twitter Share" amount={6000} completed={twitterShared} />
        <RewardItem label="First Referral" amount={10000} completed={firstReferralMade} />
        <div className="mt-4 flex justify-between items-center">
          <span className="font-semibold">Current Rewards:</span>
          <span className="font-semibold text-green-600">{totalRewards.toLocaleString()} TAU</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold">Potential Rewards:</span>
          <span className="font-semibold text-blue-600">{potentialRewards.toLocaleString()} TAU</span>
        </div>
      </CardContent>
    </Card>
  )
}

