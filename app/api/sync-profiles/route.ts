import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies })

  // Check if user is an admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get all users from Auth
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error("Error fetching auth users:", authError)
    return NextResponse.json({ error: "Failed to fetch auth users" }, { status: 500 })
  }

  // Get all existing profiles
  const { data: existingProfiles, error: profilesError } = await supabase.from("profiles").select("id")

  if (profilesError) {
    console.error("Error fetching existing profiles:", profilesError)
    return NextResponse.json({ error: "Failed to fetch existing profiles" }, { status: 500 })
  }

  // Create a set of existing profile IDs for faster lookup
  const existingProfileIds = new Set(existingProfiles.map((profile) => profile.id))

  // Find users who don't have profiles
  const usersWithoutProfiles = authUsers.users.filter((authUser) => !existingProfileIds.has(authUser.id))

  console.log(`Found ${usersWithoutProfiles.length} users without profiles`)

  // Create profiles for users who don't have them
  const created = []
  const errors = []

  for (const authUser of usersWithoutProfiles) {
    try {
      // Extract user metadata
      const metadata = authUser.user_metadata || {}
      
      // Get the next pioneer number
      const { data: maxPioneerNumber } = await supabase
        .from("profiles")
        .select("pioneer_number")
        .order("pioneer_number", { ascending: false })
        .limit(1)
        .single()

      const pioneerNumber = (maxPioneerNumber?.pioneer_number || 0) + 1
      const isGenesisPioneer = pioneerNumber <= 10000

      // Create profile
      const { error: insertError } = await supabase.from("profiles").insert({
        id: authUser.id,
        username: metadata.username || authUser.email?.split("@")[0] || "user",
        is_pi_user: metadata.is_pi_user || false,
        country: metadata.country || null,
        referral_source: metadata.referral_source || null,
        referred_by: metadata.referred_by || null,
        referral_code: metadata.referral_code || null,
        registration_number: String(pioneerNumber),
        pioneer_number: pioneerNumber,
        is_genesis_pioneer: isGenesisPioneer,
        email: authUser.email,
      })

      if (insertError) {
        console.error(`Error creating profile for user ${authUser.id}:`, insertError)
        errors.push({ userId: authUser.id, error: insertError.message })
      } else {
        created.push(authUser.id)
        
        // Update pioneer stats
        try {
          await supabase.rpc("increment_pioneer_stats", {
            is_genesis: isGenesisPioneer,
          })
        } catch (statsError) {
          console.error("Error updating pioneer stats:", statsError)
          
          // Fallback: Try to update the pioneer_stats_table directly
          try {
            await supabase
              .from("pioneer_stats_table")
              .update({
                total_pioneers: supabase.sql`total_pioneers + 1`,
                genesis_pioneers: isGenesisPioneer 
                  ? supabase.sql`genesis_pioneers + 1` 
                  : supabase.sql`genesis_pioneers`,
                updated_at: new Date()
              })
              
            // Refresh the materialized view
            await supabase.rpc('refresh_pioneer_stats')
          } catch (directUpdateError) {
            console.error("Error with direct pioneer stats update:", directUpdateError)
          }
        }
      }
    } catch (error) {
      console.error(`Unexpected error processing user ${authUser.id}:`, error)
      errors.push({ userId: authUser.id, error: "Unexpected error" })
    }
  }

  // Refresh pioneer stats to ensure counts are accurate
  try {
    await supabase.rpc("refresh_pioneer_stats")
  } catch (error) {
    console.error("Error refreshing pioneer stats:", error)
  }

  return NextResponse.json({
    created,
    errors,
    message: `Created ${created.length} profiles, encountered ${errors.length} errors`,
  })
}

