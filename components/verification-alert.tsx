"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { AlertCircle } from "lucide-react"

interface VerificationAlertProps {
  email: string
  userId: string
}

export function VerificationAlert({ email, userId }: VerificationAlertProps) {
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClientSupabaseClient()

  const handleResend = async () => {
    setResending(true)
    setMessage(null)

    try {
      // Generate a new verification token
      const token = btoa(
        JSON.stringify({
          user_id: userId,
          email,
          exp: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hour expiration
        }),
      )

      // Send verification email using Brevo via Edge Function
      const { error } = await supabase.functions.invoke("send-email-brevo", {
        body: {
          email,
          subject: "Verify your email for TAU Network",
          message: `
            <h1>Welcome to TAU Network!</h1>
            <p>You requested to resend the verification email. Please click the link below to verify your email:</p>
            <a href="${window.location.origin}/auth/verify?token=${token}">Verify Email</a>
            <p>If you didn't request this, please ignore this email.</p>
            <p>This link will expire in 24 hours.</p>
          `,
        },
      })

      if (error) throw error

      setMessage("Verification email sent! Please check your inbox.")
    } catch (error) {
      setMessage("Failed to send verification email. Please try again later.")
      console.error("Error sending verification email:", error)
    } finally {
      setResending(false)
    }
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-semibold">Email not verified</p>
            <p>Please check your inbox and verify your email to continue.</p>
            {message && <p className="mt-2 text-sm">{message}</p>}
          </div>
          <Button onClick={handleResend} disabled={resending} variant="outline" size="sm">
            {resending ? "Sending..." : "Resend Email"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

