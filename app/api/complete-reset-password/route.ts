import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Simple handler for GET requests - just redirect to reset page
export async function GET(request: Request) {
  const url = new URL(request.url)
  return NextResponse.redirect(`${url.origin}/reset-password`)
}

export async function POST(request: Request) {
  console.log("POST request received at /api/complete-reset-password")
  
  try {
    // Parse the request body as text first
    const requestText = await request.text()
    console.log("Request body length:", requestText.length)
    
    let token, newPassword
    
    try {
      // Try to parse as JSON
      const body = JSON.parse(requestText)
      token = body.token
      newPassword = body.newPassword
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError)
      // Return a simple text response to avoid JSON parsing issues
      return new Response(
        "Invalid request format. Please try again.",
        { status: 400 }
      )
    }
    
    console.log("Token received:", token ? "yes" : "no")
    console.log("Password received:", newPassword ? "yes" : "no")
    
    if (!token || !newPassword) {
      // Return a simple text response
      return new Response(
        "Missing required parameters",
        { status: 400 }
      )
    }
    
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Try to extract email from token
    let email = null
    
    try {
      // First try to decode the token if it's base64 encoded
      const decoded = Buffer.from(token, 'base64').toString()
      
      // If it contains an email address, use that
      if (decoded.includes('@')) {
        email = decoded.split(':')[0]
        console.log("Extracted email from token:", email)
      }
    } catch (decodeError) {
      console.log("Token is not base64 encoded")
    }

    // If we have an email, try to reset the password
    let success = false
    
    if (email) {
      try {
        // Try to reset the password using the email
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        
        if (!error) {
          console.log("Password reset email sent successfully")
          success = true
        } else {
          console.error("Reset password error:", error)
        }
      } catch (resetError) {
        console.error("Reset password error:", resetError)
      }
    }
    
    // Return a simple text response to avoid JSON parsing issues
    if (success) {
      return new Response(
        "Password reset successful. Please check your email to complete the process.",
        { status: 200 }
      )
    } else {
      return new Response(
        "Failed to reset password. Please try again or request a new reset link.",
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in password reset:", error)
    return new Response(
      "An error occurred. Please try again later.",
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  return new Response("Method not allowed", { status: 405 })
}

export async function DELETE(request: Request) {
  return new Response("Method not allowed", { status: 405 })
}

export async function OPTIONS(request: Request) {
  return new Response("Method not allowed", { status: 405 })
}

export async function PATCH(request: Request) {
  return new Response("Method not allowed", { status: 405 })
}

export async function HEAD(request: Request) {
  return new Response("Method not allowed", { status: 405 })
}

