"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmailVerificationBox } from "@/components/dashboard/email-verification-box"

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClientSupabaseClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (error || !user) {
        router.push("/")
      } else {
        setUser(user)
      }
      setLoading(false)
    }
    getUser()
  }, [supabase, router])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Welcome to your dashboard, {user?.email}</p>
          <EmailVerificationBox user={user} />
          {/* Add more dashboard content here */}
        </CardContent>
      </Card>
      <Button onClick={() => router.push("/welcome")} className="mt-4">
        Back to Welcome Page
      </Button>
    </div>
  )
}

