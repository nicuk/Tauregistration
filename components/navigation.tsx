"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"

export default function Navigation() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClientSupabaseClient()
  
  // Check if we're on a registration page with a referral code
  const isRegisterPage = pathname === "/register"
  const hasReferralCode = searchParams.has("ref")
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    
    // If we're on a registration page with a referral code,
    // redirect back to the same page with the referral code preserved
    if (isRegisterPage && hasReferralCode) {
      const referralCode = searchParams.get("ref")
      window.location.href = `/register?ref=${referralCode}`
    } else {
      window.location.href = "/"
    }
  }

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          TAUMine
        </Link>
        <div className="space-x-4">
          {/* Only show Sign Out button if we're not on login, home, or any registration page */}
          {pathname !== "/login" && 
           pathname !== "/" && 
           !isRegisterPage && (
            <Button onClick={handleSignOut} variant="secondary" className="bg-white text-gray-800 hover:bg-gray-100">
              Sign Out
            </Button>
          )}
          {pathname === "/" && (
            <Link href="/login">
              <Button variant="secondary" className="bg-white text-gray-800 hover:bg-gray-100">
                Log In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
