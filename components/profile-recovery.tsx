"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { generateReferralCode } from "@/utils/generate-referral-code"

export function ProfileRecovery({ user }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClientSupabaseClient()

  const handleRecovery = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (existingProfile) {
        setSuccess(true)
        return
      }

      // Create profile if it doesn't exist
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        username: user.user_metadata.username || user.email?.split("@")[0],
        referral_code: user.user_metadata.referral_code || generateReferralCode(user.email || "user"),
        created_at: new Date().toISOString(),
      })

      if (insertError) throw insertError

      setSuccess(true)
    } catch (error: any) {
      console.error("Profile recovery error:", error)
      setError(error.message || "Failed to recover profile")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Alert>
        <AlertDescription>Profile recovery successful! Please refresh the page.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="p-4 border rounded-md">
      <h3 className="font-semibold mb-2">Profile Recovery</h3>
      <p className="text-sm mb-4">Your profile data appears to be missing. Click below to recover your profile.</p>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button onClick={handleRecovery} disabled={loading}>
        {loading ? "Recovering..." : "Recover Profile"}
      </Button>
    </div>
  )
}

