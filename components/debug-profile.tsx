"use client"

import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugProfile() {
  const [userData, setUserData] = useState<any>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClientSupabaseClient()

  const fetchDebugData = async () => {
    setLoading(true)
    try {
      // Get auth user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) throw userError

      setUserData(user)

      // Get profile from database
      if (user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Profile fetch error:", profileError)
        }

        setProfileData(profile || null)
      }
    } catch (error) {
      console.error("Debug data fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Debug Profile Data</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={fetchDebugData} disabled={loading} variant="outline" size="sm">
          {loading ? "Loading..." : "Load Debug Data"}
        </Button>

        {userData && (
          <div className="mt-4">
            <h3 className="font-semibold">Auth User:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
              {JSON.stringify(userData, null, 2)}
            </pre>
          </div>
        )}

        {profileData && (
          <div className="mt-4">
            <h3 className="font-semibold">Database Profile:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
              {JSON.stringify(profileData, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

