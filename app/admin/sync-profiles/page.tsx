"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function SyncProfilesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/sync-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync profiles")
      }

      setResult(data)
    } catch (err: any) {
      console.error("Error syncing profiles:", err)
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Sync User Profiles</CardTitle>
          <CardDescription>
            This tool will create profile records for users who exist in Authentication but don&apos;t have
            corresponding database records. It will also fix the Genesis Pioneer counter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Use this tool when you notice users are getting &quot;User from sub claim in JWT does not exist&quot; errors
            or when the Genesis Pioneer counter is incorrect.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                <p>Synchronized {result.created.length} users</p>
                {result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Errors ({result.errors.length}):</p>
                    <ul className="list-disc pl-5 text-sm">
                      {result.errors.map((err: any, index: number) => (
                        <li key={index}>
                          User {err.userId}: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSync} disabled={loading} className="w-full">
            {loading ? "Syncing Profiles..." : "Sync Profiles"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

