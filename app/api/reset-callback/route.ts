import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const newPassword = url.searchParams.get("new_password")
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    if (!newPassword) {
      return NextResponse.json({ error: "Missing password parameter" }, { status: 400 })
    }

    // The user should now have an authenticated session from the Supabase redirect
    // We can now update their password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      console.error("Password update error:", error)
      throw error
    }

    // Redirect to the reset success page
    return NextResponse.redirect(`${url.origin}/reset-password?success=true`)
  } catch (error: any) {
    console.error("Error in reset callback:", error)
    return NextResponse.redirect(`${url.origin}/reset-password?error=${encodeURIComponent(error.message || "Failed to reset password")}`)
  }
}

