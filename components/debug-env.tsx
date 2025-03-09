"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DebugEnv() {
  const [envStatus, setEnvStatus] = useState<{
    supabaseUrl?: string
    supabaseKeyLength?: number
    error?: string
  }>({})

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    setEnvStatus({
      supabaseUrl: url ? `${url.substring(0, 15)}...` : undefined,
      supabaseKeyLength: key?.length,
      error: !url || !key ? "Missing required environment variables" : undefined,
    })
  }, [])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Environment Debug</CardTitle>
      </CardHeader>
      <CardContent>
        {envStatus.error ? (
          <Alert variant="destructive">
            <AlertDescription>{envStatus.error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <p>Supabase URL: {envStatus.supabaseUrl}</p>
            <p>Supabase Key Length: {envStatus.supabaseKeyLength}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

