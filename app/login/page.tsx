"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientSupabaseClient, enhancedAuth } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ForgotPasswordForm } from "@/components/forgot-password-form"
import { v4 as uuidv4 } from "uuid"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // First check if we're in development mode with a stored user
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          const devModeUser = localStorage.getItem('devModeUser')
          if (devModeUser) {
            router.push('/welcome')
            return
          }
        }
        
        // Check for referral code in URL
        const urlParams = new URLSearchParams(window.location.search)
        const hasReferralCode = urlParams.has('ref')
        
        // If there's a referral code, don't redirect even if logged in
        // This allows users to register with the referral code
        if (hasReferralCode) {
          console.log('Referral code detected, staying on login page for registration')
          return
        }
        
        // Then try to get the session using the standard method
        try {
          const { data } = await supabase.auth.getSession()
          
          if (data.session) {
            // User is already logged in, redirect to welcome page
            router.push('/welcome')
            return
          }
        } catch (standardError) {
          // Silent fail - we'll continue with the login page
          console.log('Standard auth check failed, continuing with login page')
        }
      } catch (error) {
        console.error('Error checking session:', error)
        // Don't set an error message for the user - just let them log in
      }
    }

    checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Special handling for test account in development mode
      if (process.env.NODE_ENV === "development" && email === "test@taumine.com" && password === "test123") {
        // Create pre-verified test user data with a valid UUID
        const testUserData = {
          id: uuidv4(), // Generate a valid UUID
          email: "test@taumine.com",
          email_confirmed_at: new Date().toISOString(), // Pre-verified
          user_metadata: {
            username: "Test Pioneer",
            is_pi_user: true,
            country: "us",
            referral_source: "test",
            referral_code: "TEST123",
            twitter_verified: true,
            telegram_verified: true,
            twitter_shared: true,
            first_referral: true,
          },
        }

        // Store test user data in localStorage
        localStorage.setItem("devModeUser", JSON.stringify(testUserData))
        router.push("/welcome")
        return
      }

      // Use enhanced auth with retry logic
      const { data, error } = await enhancedAuth.signIn({
        email,
        password,
      })

      if (error) throw error

      // If in development mode, also store the user in localStorage for convenience
      if (process.env.NODE_ENV === "development" && data.user) {
        localStorage.setItem("devModeUser", JSON.stringify(data.user))
      }

      router.push("/welcome")
    } catch (error: any) {
      // Handle specific error cases
      if (error.message?.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.")
      } else if (error.message?.includes("rate limit")) {
        setError("Too many login attempts. Please try again later.")
      } else if (
        error.message?.includes("Invalid Refresh Token") ||
        error.message?.includes("Refresh Token Not Found")
      ) {
        // Clear any existing session and reload
        await supabase.auth.signOut()
        setError("Your session has expired. Please log in again.")
      } else {
        setError(error.message || "An unexpected error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const currentUrl = window.location.origin
      const redirectUrl = `${currentUrl}/auth/callback`
      
      // Check for referral code in URL
      const urlParams = new URLSearchParams(window.location.search)
      const refCode = urlParams.get('ref')
      
      // Store referral code in localStorage so it can be used after OAuth redirect
      if (refCode) {
        localStorage.setItem('pendingReferralCode', refCode)
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        console.error("Google sign in error:", error)
        throw error
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error("Google sign in error:", error)
      setError(error.message || "Error signing in with Google")
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Login to TAUMine</CardTitle>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
            <ForgotPasswordForm onCancel={() => setShowForgotPassword(false)} />
          ) : (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Log In"}
                </Button>
                <div className="text-center">
                  <Button variant="link" className="text-sm text-primary" onClick={() => setShowForgotPassword(true)}>
                    Forgot Password?
                  </Button>
                </div>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-2 text-xs text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Button variant="outline" type="button" onClick={handleGoogleSignIn} className="w-full">
                  <img
                    src="/google-icon.png"
                    alt="Google"
                    className="mr-2 h-5 w-5"
                  />
                  Google
                </Button>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
