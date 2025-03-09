"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"

export default function Navigation() {
  const pathname = usePathname()
  const supabase = createClientSupabaseClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          TAUMine
        </Link>
        <div className="space-x-4">
          {pathname !== "/login" && pathname !== "/" && (
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

