"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, CheckCircle, Lock } from "lucide-react"
import { sanitizeInput } from "@/utils/input-sanitization"
import { supabase } from "@/lib/supabase-client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Total Genesis Pioneer spots
const TOTAL_GENESIS_SPOTS = 10000

interface RegistrationFormProps {
  referralCode?: string
  referrerInfo?: {
    username: string
    total_referrals: number
    referral_rewards: number
  } | null
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ referralCode: initialReferralCode, referrerInfo }) => {
  const router = useRouter()
  const supabaseClient = supabase
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isPiUser, setIsPiUser] = useState(false)
  const [country, setCountry] = useState("")
  const [referralSource, setReferralSource] = useState("")
  const [referralCode, setReferralCode] = useState(initialReferralCode || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalUsers, setTotalUsers] = useState(0)
  const [spotsRemaining, setSpotsRemaining] = useState(TOTAL_GENESIS_SPOTS)
  const [percentageFilled, setPercentageFilled] = useState(0)

  useEffect(() => {
    async function fetchTotalUsers() {
      try {
        setLoading(true)
        const { count, error } = await supabaseClient.from("profiles").select("*", { count: "exact", head: true })

        if (error) {
          console.error("Error fetching user count:", error)
          throw error
        }

        const userCount = count || 0
        setTotalUsers(userCount)
        const remaining = Math.max(0, TOTAL_GENESIS_SPOTS - userCount)
        setSpotsRemaining(remaining)
        setPercentageFilled((userCount / TOTAL_GENESIS_SPOTS) * 100)
      } catch (error) {
        console.error("Error fetching user count:", error)
        setTotalUsers(0)
        setSpotsRemaining(TOTAL_GENESIS_SPOTS)
        setPercentageFilled(0)
      } finally {
        setLoading(false)
      }
    }

    fetchTotalUsers()
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!email || !password || !username) {
        throw new Error("Please fill in all required fields")
      }

      // Client-side validation for email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error("Please enter a valid email address")
      }

      // Client-side validation for password strength
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long")
      }

      const sanitizedUsername = sanitizeInput(username)
      const sanitizedEmail = sanitizeInput(email)

      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: sanitizedEmail,
          password,
          username: sanitizedUsername,
          isPiUser,
          country: sanitizeInput(country),
          referralSource: sanitizeInput(referralSource),
          referralCode: sanitizeInput(referralCode),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Provide more specific user-friendly error messages
        if (response.status === 400) {
          if (data.error === "email_already_registered") {
            throw new Error(data.message || "This email address is already registered. Please use a different email or try logging in.")
          } else if (data.error.includes("email")) {
            throw new Error("This email address cannot be used. Please try another one.")
          } else if (data.error.includes("password")) {
            throw new Error("Your password doesn't meet the security requirements. Please use a stronger password.")
          } else {
            throw new Error(data.error || "Registration failed. Please check your information and try again.")
          }
        } else {
          throw new Error(data.error || "Registration failed. Please try again.")
        }
      }

      router.push("/welcome")
    } catch (error: any) {
      console.error("Sign up error:", error)
      setError(error.message || "An unexpected error occurred during sign up")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      const currentUrl = window.location.origin
      const redirectUrl = `${currentUrl}/auth/callback`

      const { data, error } = await supabaseClient.auth.signInWithOAuth({
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

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="flex flex-col items-center space-y-4 pb-2">
        <div className="w-16 h-16 flex items-center justify-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Work__10_-removebg-preview-pC0L9vOwcVGasdyZKvzBtMlJk1PihC.png"
            alt="TAU Network Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Join TAU Network as a Pioneer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Be among the first 10,000 users to receive Genesis Pioneer status with exclusive rewards and benefits
          </p>
        </div>
        <div className="w-full">
          <div className="flex justify-between text-sm mb-1">
            <span>Genesis Pioneer spots</span>
            <span className="font-medium">
              {formatNumber(TOTAL_GENESIS_SPOTS - spotsRemaining)}/{formatNumber(TOTAL_GENESIS_SPOTS)} claimed
            </span>
          </div>
          <Progress value={percentageFilled} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignUp} className="space-y-4">
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
              placeholder="Create a secure password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username / Display Name</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="How you'll appear in the network"
            />
          </div>

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox id="pi-user" checked={isPiUser} onCheckedChange={(checked) => setIsPiUser(checked as boolean)} />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="pi-user"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I am a Pi Network user <span className="text-emerald-500 font-medium">(+5% mining bonus)</span>
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country/Region (Optional)</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger id="country">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="au">Australia</SelectItem>
                <SelectItem value="in">India</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referral-source">How did you hear about us?</Label>
            <Select value={referralSource} onValueChange={setReferralSource}>
              <SelectTrigger id="referral-source">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="friend">Friend or Family</SelectItem>
                <SelectItem value="search">Search Engine</SelectItem>
                <SelectItem value="news">News Article</SelectItem>
                <SelectItem value="pi">Pi Network</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referral-code">Referral Code</Label>
            <Input
              id="referral-code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Enter referral code if you have one"
              readOnly={!!initialReferralCode}
              className={initialReferralCode ? "bg-gray-100" : ""}
            />
            {referrerInfo && (
              <p className="text-xs text-green-600">Referral Applied: Invited by {referrerInfo.username}</p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full bg-indigo-700 hover:bg-indigo-800" disabled={loading}>
            {loading ? "Processing..." : "Join TAUMine"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-xs text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Button variant="outline" type="button" onClick={handleGoogleSignUp} className="w-full">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/channels4_profile.jpg-YaHk7W4n3eYLCVHdS3culmbJp92fxo.jpeg"
              alt="Google"
              className="mr-2 h-5 w-5"
            />
            Google
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-xs text-center text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-primary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
        </div>
        <div className="flex justify-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center">
            <Lock className="h-3 w-3 mr-1" />
            <span>Secure Connection</span>
          </div>
          <div className="flex items-center">
            <Shield className="h-3 w-3 mr-1" />
            <span>Data Protected</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            <span>Verified</span>
          </div>
        </div>
        <div className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

export default RegistrationForm

