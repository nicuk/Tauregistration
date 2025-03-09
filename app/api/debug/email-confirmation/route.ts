import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { email } = await request.json()

    // Simulate email confirmation in development
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: {
          confirmation_sent: true,
          test_mode: true,
        },
      },
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Test confirmation email simulated",
      data,
    })
  } catch (error: any) {
    console.error("Debug email confirmation error:", error)
    return NextResponse.json({ error: error.message || "Failed to simulate email confirmation" }, { status: 500 })
  }
}

