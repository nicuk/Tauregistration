"use client"

import { useState, useEffect } from "react"
import { Mail, X, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClientSupabaseClient } from "@/lib/supabase-client"

interface EmailVerificationProps {
  email: string
  onDismiss?: () => void
}

export function EmailVerification({ email, onDismiss }: EmailVerificationProps) {
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const savedCooldown = localStorage.getItem("emailVerificationCooldown")
    if (savedCooldown) {
      const remainingTime = Number.parseInt(savedCooldown) - Date.now()
      if (remainingTime > 0) {
        setCooldown(Math.ceil(remainingTime / 1000))
      }
    }
  }, [])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [cooldown])

  const handleResendEmail = async () => {
    if (cooldown > 0) return

    setSending(true)
    setMessage(null)

    try {
      // Get current user to include in token
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) throw userError

      // Generate verification token
      const token = btoa(
        JSON.stringify({
          user_id: user?.id,
          email,
          exp: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hour expiration
        }),
      )

      // Send verification email using API route instead of direct Edge Function call
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send verification email")
      }

      setMessage({ type: "success", text: "Verification email sent!" })
      setCooldown(30)
      localStorage.setItem("emailVerificationCooldown", (Date.now() + 30000).toString())
    } catch (error: any) {
      console.error("Error sending verification email:", error)
      setMessage({
        type: "error",
        text: "Failed to send verification email. Please try again.",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="w-full bg-[#f5f6fa] rounded-lg p-4 relative">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <Mail className="h-5 w-5 text-gray-600" />
          <span className="font-semibold text-gray-900">Email Verification</span>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <p className="mt-2 text-gray-600">Please verify your email to continue.</p>

      <Button
        onClick={handleResendEmail}
        disabled={sending || cooldown > 0}
        className="mt-4 bg-black text-white hover:bg-gray-800 w-full"
      >
        {sending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : cooldown > 0 ? (
          `Resend available in ${cooldown}s`
        ) : (
          "Resend Verification Email"
        )}
      </Button>

      {message && (
        <div className="mt-4">
          {message.type === "success" ? (
            <Alert className="bg-[#fff8f0] border-[#ff9f43] text-[#ff9f43]">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}

