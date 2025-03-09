import { createClientSupabaseClient } from "@/lib/supabase-client"

export async function trackUserIP(userId: string) {
  if (!userId) {
    console.error("No user ID provided to trackUserIP")
    return { success: false, error: "No user ID provided" }
  }

  const supabase = createClientSupabaseClient()

  try {
    // In development mode, use a mock IP
    if (process.env.NODE_ENV === "development") {
      const mockIP = "127.0.0.1"
      console.log("Development mode: Using mock IP", mockIP)

      // In development, just log the action instead of inserting into the database
      console.log(`Mock IP tracking: User ${userId} accessed from IP ${mockIP}`)
      return { success: true, ip: mockIP }
    }

    // Production mode: Get real IP
    const response = await fetch("https://api64.ipify.org?format=json")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    if (!data.ip) {
      throw new Error("No IP address returned from API")
    }

    const { error } = await supabase.from("user_ips").upsert({
      user_id: userId,
      ip: data.ip,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Database error:", error)
      return { success: false, error: error.message }
    }

    console.log("IP tracked successfully:", data.ip)
    return { success: true, ip: data.ip }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    console.error("Error tracking user IP:", errorMessage)
    return { success: false, error: errorMessage }
  }
}

