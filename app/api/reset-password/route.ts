import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import crypto from "crypto"

export async function POST(request: Request) {
  const { email } = await request.json()
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Use Supabase's built-in password reset functionality
    // But specify our custom reset page as the redirect URL
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.headers.get("origin")}/reset-password`,
    })

    if (error) {
      console.error("Error sending password reset email:", error)
      
      // If Supabase's email fails (e.g., due to rate limits), use our Brevo service
      try {
        // Create a simple token for our custom flow
        const expiration = Date.now() + 3600000 // 1 hour expiration
        const token = Buffer.from(`${email}:${expiration}`).toString('base64')

        // Use our Brevo email service to send the reset email
        const { error: brevoError } = await supabase.functions.invoke("send-email-brevo", {
          body: {
            email,
            subject: "Reset your password for TAU Network",
            message: `
              <h1>Password Reset for TAU Network</h1>
              <p>You have requested to reset your password. Click the link below to set a new password:</p>
              <a href="${request.headers.get("origin")}/reset-password?token=${token}">Reset Password</a>
              <p>If you didn't request this, please ignore this email.</p>
              <p>This link will expire in 1 hour.</p>
            `,
          },
        })

        if (brevoError) throw brevoError
      } catch (backupError) {
        console.error("Backup email service failed:", backupError)
        throw error // Throw the original Supabase error
      }
    }

    return NextResponse.json({ message: "Password reset email sent successfully" })
  } catch (error: any) {
    console.error("Error sending password reset email:", error)
    return NextResponse.json({ error: error.message || "Failed to send password reset email" }, { status: 500 })
  }
}

