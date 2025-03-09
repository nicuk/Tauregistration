"use client"

import { useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>We apologize for the inconvenience. An unexpected error occurred.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={reset}>Try again</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

