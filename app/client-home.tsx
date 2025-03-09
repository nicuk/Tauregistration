"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"

const ErrorBoundary = dynamic(() => import("@/components/error-boundary"), { ssr: false })
const RegistrationForm = dynamic(() => import("@/components/registration-form"), { ssr: false })

// This component handles the referral code logic without useSearchParams
function ClientHomeContent() {
  const router = useRouter()

  useEffect(() => {
    // Get the URL parameters without using useSearchParams
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get("ref")

    // If ref is 'undefined' (as a string) or undefined (as a value), redirect to clean URL
    if (ref === "undefined" || ref === null) {
      // Remove the ref parameter by redirecting to the base URL
      if (urlParams.has("ref")) {
        router.replace("/")
      }
    } else if (ref) {
      // If there's a valid ref parameter, redirect to the register page with it
      router.replace(`/register?ref=${ref}`)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <ErrorBoundary>
        <RegistrationForm />
      </ErrorBoundary>
    </div>
  )
}

export default function ClientHome() {
  return (
    <Suspense
      fallback={<div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>}
    >
      <ClientHomeContent />
    </Suspense>
  )
}

