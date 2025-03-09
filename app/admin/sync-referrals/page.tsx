"use client"

import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

export default function SyncReferralsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientSupabaseClient()

  const handleSync = async () => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      // Call the sync-referrals API endpoint
      const response = await fetch("/api/sync-referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to sync referral stats")
      }

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      console.error("Error syncing referral stats:", error)
      setError(error.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Sync Referral Statistics</CardTitle>
          <CardDescription>
            This tool will synchronize referral statistics for all users. It will count referrals, calculate tiers, and
            update the leaderboard rankings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Button
              onClick={handleSync}
              disabled={loading}
              className="w-full max-w-xs"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Referral Stats...
                </>
              ) : (
                "Sync Referral Stats"
              )}
            </Button>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className="mt-4 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700">Success</AlertTitle>
                <AlertDescription className="text-green-600">
                  {result.message}
                </AlertDescription>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Updated: {result.updated?.length || 0} users</p>
                  <p className="text-sm font-medium">Errors: {result.errors?.length || 0} users</p>
                  
                  {result.errors?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Error details:</p>
                      <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-100 p-2 text-xs">
                        {JSON.stringify(result.errors, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

