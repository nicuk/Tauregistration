"use client"

import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SupabaseConnectionTest() {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClientSupabaseClient()

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Test 1: Check if we can get the Supabase URL and key
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !key) {
        throw new Error("Missing Supabase environment variables")
      }

      // Test 2: Try to get the user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        throw new Error(`Auth session error: ${sessionError.message}`)
      }

      // Test 3: Try to query the database
      const { data: dbData, error: dbError } = await supabase.from("profiles").select("*").limit(1)

      if (dbError) {
        if (dbError.code === "42P01") {
          throw new Error("Table 'profiles' does not exist. You may need to create it.")
        } else {
          throw new Error(`Database error: ${dbError.message} (Code: ${dbError.code})`)
        }
      }

      // All tests passed
      setResult({
        connection: "Success",
        url: url.substring(0, 15) + "...", // Only show part of the URL for security
        sessionExists: !!sessionData.session,
        dbQuerySuccess: true,
        dbData: dbData || [],
      })
    } catch (err: any) {
      setError(err.message || "Unknown error occurred")
      console.error("Connection test error:", err)
    } finally {
      setLoading(false)
    }
  }

  const testApiEndpoint = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/test-supabase", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        // Get the raw text to see what's being returned
        const text = await response.text()
        throw new Error(
          `Expected JSON response but got: ${contentType}\n\nFirst 100 chars: ${text.substring(0, 100)}...`,
        )
      }

      const data = await response.json()
      setResult({
        apiEndpoint: "Success",
        status: response.status,
        data,
      })
    } catch (err: any) {
      setError(err.message || "Unknown error occurred")
      console.error("API endpoint test error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-4">
          <Button onClick={testConnection} disabled={loading}>
            {loading ? "Testing..." : "Test Direct Connection"}
          </Button>
          <Button onClick={testApiEndpoint} disabled={loading} variant="outline">
            {loading ? "Testing..." : "Test API Endpoint"}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-medium mb-2">Test Results:</h3>
            <pre className="text-xs overflow-auto p-2 bg-background rounded">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}

        <div className="text-sm space-y-2 border-t pt-4">
          <h3 className="font-medium">Troubleshooting Tips:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Verify your environment variables are correctly set</li>
            <li>Check if your Supabase project is active and not paused</li>
            <li>Ensure your database has the required tables</li>
            <li>Check for RLS policies that might be blocking access</li>
            <li>Verify your API endpoints are returning proper JSON</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

