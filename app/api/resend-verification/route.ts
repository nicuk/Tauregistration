import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const { email } = await request.json()
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Get user data to include in the token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError

    // Generate a verification token
    const token = btoa(
      JSON.stringify({
        user_id: user?.id,
        email,
        exp: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hour expiration
      }),
    )

    // Send verification email using Brevo via Edge Function
    const { error: emailError } = await supabase.functions.invoke("send-email-brevo", {
      body: {
        email,
        subject: "Verify your email for TAU Network",
        message: `
          <h1>Welcome to TAU Network!</h1>
          <p>You requested to verify your email. Please click the link below to verify your email address:</p>
          <a href="${request.headers.get("origin")}/auth/verify?token=${token}">Verify Email</a>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
        `,
      },
    })

    if (emailError) throw emailError

    return NextResponse.json({ message: "Verification email sent successfully" })
  } catch (error: any) {
    console.error("Error sending verification email:", error)
    return NextResponse.json({ error: error.message || "Failed to send verification email" }, { status: 500 })
  }
}

