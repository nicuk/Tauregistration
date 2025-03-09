"use client"

import { useState } from "react"
import { Mail, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Alert } from "@/components/ui/alert"

interface EmailVerificationBoxProps {
  email: string
  onDismiss?: () => void
}

export function EmailVerificationBox({ email, onDismiss }: EmailVerificationBoxProps) {
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClientSupabaseClient()

  const handleResendEmail = async () => {
    setSending(true)
    setMessage(null)

    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setMessage("Verification email sent! Please check your inbox.")
    } catch (error: any) {
      setMessage(error.message || "Failed to send verification email")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-blue-50 rounded-lg p-4 relative">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <Mail className="h-5 w-5 text-blue-500" />
          <span className="font-semibold text-blue-900">Email Verification</span>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="mt-2 text-blue-800">Please verify your email to continue.</p>
      <Button onClick={handleResendEmail} disabled={sending} className="mt-4 bg-black text-white hover:bg-gray-800">
        {sending ? "Sending..." : "Resend Verification Email"}
      </Button>
      {message && (
        <Alert className="mt-4" variant={message.includes("Failed") ? "destructive" : "default"}>
          {message}
        </Alert>
      )}
    </div>
  )
}

