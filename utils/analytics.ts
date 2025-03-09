import { createClientSupabaseClient } from "@/lib/supabase-client"

export async function trackPageView(userId: string, page: string) {
  const supabase = createClientSupabaseClient()

  try {
    const { error } = await supabase
      .from("page_views")
      .insert({ user_id: userId, page: page, viewed_at: new Date().toISOString() })

    if (error) throw error
  } catch (error) {
    console.error("Error tracking page view:", error)
  }
}

