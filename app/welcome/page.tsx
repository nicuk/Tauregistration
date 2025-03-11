"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, hasSession } from "@/lib/supabase-client"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OverviewTab } from "@/components/dashboard/overview-tab"
import { VerificationTab } from "@/components/dashboard/verification-tab"
import { ReferralDashboardTab } from "@/components/referral-dashboard/referral-dashboard-tab"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EmailVerification } from "@/components/email-verification"
import { CheckCircle } from "lucide-react"

export default function WelcomePage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [pioneerNumber, setPioneerNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true)

        const session = await hasSession()

        if (!session) {
          console.error("Session check error: No session found")
          if (process.env.NODE_ENV === "development") {
            const devModeUser = localStorage.getItem("devModeUser")
            if (devModeUser) {
              const parsedUser = JSON.parse(devModeUser)
              setUser(parsedUser)
              setProfile(parsedUser.user_metadata)
              setPioneerNumber(1)
            } else {
              router.push("/login")
              return
            }
          } else {
            router.push("/login")
            return
          }
        }

        if (session) {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser()

          if (userError) {
            console.error("User fetch error:", userError.message)
            setError("Error fetching user: " + userError.message)
            return
          }

          setUser(user)
          
          // Fetch the user's profile from the database
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()
            
          if (profileError && profileError.code !== "PGRST116") {
            console.error("Error fetching profile:", profileError)
          }
          
          // If profile exists in database, use it; otherwise fallback to metadata
          if (profileData) {
            setProfile(profileData)
            setPioneerNumber(profileData.pioneer_number)
          } else {
            console.log("No profile found in database, using metadata")
            setProfile(user.user_metadata || {})
            
            // Try to create a profile if it doesn't exist
            try {
              const { error: insertError } = await supabase.from("profiles").upsert({
                id: user.id,
                username: user.user_metadata?.username || user.email?.split('@')[0],
                email: user.email,
                created_at: new Date(),
                updated_at: new Date()
              }, { onConflict: 'id' })
              
              if (insertError) {
                console.error("Error creating profile:", insertError)
              } else {
                // Fetch the profile again after creating it
                const { data: newProfile } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", user.id)
                  .single()
                  
                if (newProfile) {
                  setProfile(newProfile)
                  setPioneerNumber(newProfile.pioneer_number)
                }
              }
            } catch (err) {
              console.error("Error in profile creation:", err)
            }
          }
        } else {
          setError("Session check error: No session found")
          // Don't redirect immediately, give the user a chance to see the error
          setTimeout(() => {
            router.push("/register")
          }, 3000)
          return
        }
      } catch (error: any) {
        console.error("Error in checkSession:", error)
        setError(error.message || "An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900">
        <Card className="w-full max-w-md p-6">
          <CardContent className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-lg font-medium text-white">Loading your profile...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900">
        <Card className="w-full max-w-md p-6">
          <CardContent className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4 text-white">Error</h2>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push("/")}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900">
        <Card className="w-full max-w-md p-6">
          <CardContent className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4 text-white">Error</h2>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>Unable to load user data. Please try signing in again.</AlertDescription>
            </Alert>
            <Button onClick={() => router.push("/")}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to TAUMine</h1>
          <p className="text-gray-400">Complete verification steps to unlock your rewards</p>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="verification">Verification</TabsTrigger>
                <TabsTrigger value="referral">Referral Dashboard</TabsTrigger>
              </TabsList>
              <div className="w-full sm:w-auto">
                {profile && typeof profile === 'object' && profile.email_verified ? (
                  <div className="w-full bg-[#f0fff4] border border-green-200 rounded-lg p-4 relative">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">Email Verified</span>
                    </div>
                  </div>
                ) : (
                  <EmailVerification email={user?.email || ""} />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6">
            <TabsContent value="overview">
              <OverviewTab user={user || {}} profile={profile || {}} pioneerNumber={pioneerNumber} />
            </TabsContent>
            <TabsContent value="verification">
              <VerificationTab user={user || {}} profile={profile || {}} pioneerNumber={pioneerNumber} />
            </TabsContent>
            <TabsContent value="referral">
              <ReferralDashboardTab user={user || {}} profile={profile || {}} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
