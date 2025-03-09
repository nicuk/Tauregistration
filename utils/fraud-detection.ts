import { createClientSupabaseClient } from "@/lib/supabase-client"

export async function checkForFraudulentActivity(userId: string, ip: string): Promise<boolean> {
  const supabase = createClientSupabaseClient()

  // Check for multiple accounts from the same IP
  const { data: sameIPAccounts, error: ipError } = await supabase.from("user_ips").select("user_id").eq("ip", ip)

  if (ipError) {
    console.error("Error checking IP addresses:", ipError)
    return false
  }

  if (sameIPAccounts && sameIPAccounts.length > 5) {
    console.warn(`Potential fraud detected: Multiple accounts (${sameIPAccounts.length}) from IP ${ip}`)
    return true
  }

  // Check for rapid account creation
  const { data: recentAccounts, error: recentError } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .order("created_at", { ascending: false })
    .limit(1)

  if (recentError) {
    console.error("Error checking recent accounts:", recentError)
    return false
  }

  if (recentAccounts && recentAccounts.length > 0) {
    const accountCreationTime = new Date(recentAccounts[0].created_at).getTime()
    const now = Date.now()
    const timeSinceCreation = now - accountCreationTime

    if (timeSinceCreation < 60000) {
      // Less than 1 minute
      console.warn(`Potential fraud detected: Rapid account creation for user ${userId}`)
      return true
    }
  }

  return false
}

