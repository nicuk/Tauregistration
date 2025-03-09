import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data, error } = await supabase.from("profiles").select("*").limit(1)

    if (error) {
      console.error("Supabase query error:", error)
      return NextResponse.json({ error: "Failed to query database", details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred", details: error }, { status: 500 })
  }
}

