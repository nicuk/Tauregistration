import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Auth error:", error)
        return NextResponse.redirect(new URL("/auth-error", request.url))
      }

      // Successful authentication
      return NextResponse.redirect(new URL("/welcome", request.url))
    } catch (error) {
      console.error("Unexpected error:", error)
      return NextResponse.redirect(new URL("/auth-error", request.url))
    }
  }

  // If no code is present, redirect to home
  return NextResponse.redirect(new URL("/", request.url))
}

