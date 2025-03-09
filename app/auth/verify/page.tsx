"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface DecodedToken {
  user_id: string
  email: string
  exp: number
}

export default function VerifyEmailPage() {
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token")

      if (!token) {
        setVerificationStatus("error")
        setErrorMessage("Invalid or missing verification token")
        return
      }

      try {
        // Decode and validate token
        const decodedToken = JSON.parse(atob(token)) as DecodedToken
        const { user_id, email, exp } = decodedToken

        // Check if token is expired
        if (Date.now() / 1000 > exp) {
          setVerificationStatus("error")
          setErrorMessage("Verification token has expired")
          return
        }

        // Update user's email verification status
        const { error: updateError } = await supabase.auth.updateUser({
          data: { email_confirmed_at: new Date().toISOString() },
        })

        if (updateError) throw updateError

        // Update the user's profile in the database
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ email_verified: true })
          .eq("id", user_id)

        if (profileError) throw profileError

        setVerificationStatus("success")
      } catch (error: any) {
        console.error("Error verifying email:", error)
        setVerificationStatus("error")
        setErrorMessage(error.message || "An error occurred while verifying your email")
      }
    }

    verifyEmail()
  }, [searchParams, supabase])

  const handleContinue = () => {
    router.push("/welcome")
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
        </CardHeader>
        <CardContent>
          {verificationStatus === "loading" && (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          )}

          {verificationStatus === "success" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-6">
                <div className="rounded-full bg-green-100 p-3 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-600 mb-2">Email verified successfully!</h3>
                <p className="text-gray-600 text-center">
                  Your email has been verified. You can now continue to your dashboard.
                </p>
              </div>
              <Button onClick={handleContinue} className="w-full bg-[#ff9f43] hover:bg-[#ff9f43]/90 text-white">
                Continue to Welcome Page
              </Button>
            </div>
          )}

          {verificationStatus === "error" && (
            <div className="space-y-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
              <Button onClick={() => router.push("/welcome")} variant="outline" className="w-full">
                Return to Welcome Page
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

