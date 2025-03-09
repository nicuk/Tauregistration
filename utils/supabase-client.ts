import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Create and export the function to create a client
export const createClientSupabaseClient = () => {
  return createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    options: {
      auth: {
        persistSession: true,
        storageKey: "tau-network-auth",
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  })
}

// Create a Supabase client for use in client components
// with improved session persistence and error handling
export const supabase = createClientSupabaseClient()

// Helper function to check if a session exists
export async function hasSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error("Session check error:", error.message)
      return false
    }
    return !!data.session
  } catch (err) {
    console.error("Unexpected error checking session:", err)
    return false
  }
}

export const sendEmailViaEdgeFunction = async (email: string, subject: string, message: string) => {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { email, subject, message },
  })

  if (error) throw error
  return data
}

