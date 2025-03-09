"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setError("Invalid or missing reset token")
      return
    }

    try {
      const decodedToken = JSON.parse(atob(token))
      const { email, exp } = decodedToken

      if (Date.now() / 1000 > exp) {
        setError("Reset token has expired")
      } else {
        setTokenValid(true)
      }
    } catch (error) {
      setError("Invalid reset token")
    }
  }, [searchParams])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const token = searchParams.get("token")
      const decodedToken = JSON.parse(atob(token!))
      const { email } = decodedToken

      // Update the user's password
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) throw error

      setResetSuccess(true)
    } catch (error: any) {
      setError(error.message || "An error occurred while resetting your password")
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    router.push("/login")
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          {resetSuccess ? (
            <>
              <Alert>
                <AlertDescription>Your password has been successfully reset!</AlertDescription>
              </Alert>
              <Button onClick={handleContinue} className="w-full mt-4">
                Continue to Login
              </Button>
            </>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter your new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your new password"
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

