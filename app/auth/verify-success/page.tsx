"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export default function VerificationSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/welcome")
    }, 5000) // Redirect after 5 seconds

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Email Verified!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-lg mb-4">Your email has been successfully verified.</p>
          <p className="text-sm text-muted-foreground">You will be redirected to the welcome page in 5 seconds...</p>
        </CardContent>
      </Card>
    </div>
  )
}

