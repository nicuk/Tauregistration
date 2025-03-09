import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { z } from "zod"

// Define a schema for profile data
const ProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  is_pi_user: z.boolean(),
  country: z.string().optional(),
  referral_source: z.string().optional(),
  referred_by: z.string().optional(),
  referral_code: z.string(),
})

export async function POST(request: Request) {
  // Add CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  }

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { headers })
  }

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const rawProfileData = await request.json()

    // Validate the profile data
    const validationResult = ProfileSchema.safeParse(rawProfileData)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid profile data", details: validationResult.error.errors },
        { status: 400, headers },
      )
    }

    const profileData = validationResult.data

    const { data, error } = await supabase.from("profiles").insert([profileData]).select()

    if (error) {
      return NextResponse.json({ error: "Failed to create profile", details: error }, { status: 500, headers })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No profile data returned" }, { status: 500, headers })
    }

    return NextResponse.json(data[0], { headers })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred", details: String(error) },
      { status: 500, headers },
    )
  }
}

// Handle OPTIONS requests
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

