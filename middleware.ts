import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Create a new supabase middleware client on each request
  const supabase = createMiddlewareClient({ req, res })
  
  try {
    // Get the session with proper error handling
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    
    if (error) {
      console.error("Middleware session error:", error.message)
      // Don't redirect on error, just continue to the page and let client-side handle it
      return res
    }

    // If there's no session and the user is trying to access protected pages, redirect to the registration page
    if (!session && req.nextUrl.pathname.startsWith("/welcome")) {
      return NextResponse.redirect(new URL("/register", req.url))
    }

    // If there's a session and the user is trying to access register or root, redirect to welcome
    if (session && (req.nextUrl.pathname === "/register" || req.nextUrl.pathname === "/")) {
      return NextResponse.redirect(new URL("/welcome", req.url))
    }

    return res
  } catch (err) {
    console.error("Unexpected middleware error:", err)
    // On unexpected errors, just continue to the requested page
    return res
  }
}

export const config = {
  matcher: ["/", "/welcome", "/register"],
}

