"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface VerificationWarningProps {
  type: "twitter" | "telegram"
}

export function VerificationWarning({ type }: VerificationWarningProps) {
  const guidelines = {
    twitter: {
      title: "Twitter Verification Guidelines",
      points: [
        "Enter your full Twitter profile URL (e.g., https://twitter.com/yourusername)",
        "Make sure your Twitter account is public",
        "Ensure you've followed @tau_mine on Twitter",
        "Your Twitter account must be created before 2025"
      ]
    },
    telegram: {
      title: "Telegram Verification Guidelines",
      points: [
        "Enter your full Telegram profile URL (e.g., https://t.me/yourusername)",
        "Make sure you've joined the TAUMine Telegram group",
        "Your Telegram username must match the one you're verifying"
      ]
    }
  }

  const content = guidelines[type]

  return (
    <Alert variant="warning" className="mb-4 bg-amber-50 border-amber-200">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">{content.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-amber-700 mb-2">
          Providing incorrect information may invalidate your rewards and verification status.
        </p>
        <ul className="list-disc pl-5 text-sm text-amber-700 space-y-1">
          {content.points.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
