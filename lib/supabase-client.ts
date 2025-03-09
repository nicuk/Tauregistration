import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { withRetry } from "@/utils/api-helpers"

// Track token refresh attempts to prevent infinite loops
let refreshAttempts = 0
const MAX_REFRESH_ATTEMPTS = 3

// Create a singleton instance for the client
let supabaseClientInstance: ReturnType<typeof createClientComponentClient> | null = null

export const createClientSupabaseClient = () => {
  if (typeof window !== "undefined" && supabaseClientInstance) {
    return supabaseClientInstance
  }

  supabaseClientInstance = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: "tau-auth-token",
        storage: {
          getItem: (key) => {
            if (typeof window === "undefined") {
              return null
            }
            return window.localStorage.getItem(key)
          },
          setItem: (key, value) => {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(key, value)
            }
          },
          removeItem: (key) => {
            if (typeof window !== "undefined") {
              window.localStorage.removeItem(key)
            }
          },
        },
      },
    },
  })

  // Add event listener for auth state changes
  supabaseClientInstance.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED") {
      console.log("Token refreshed successfully")
      refreshAttempts = 0 // Reset refresh attempts on successful refresh
    } else if (event === "SIGNED_OUT") {
      console.log("User signed out")
      refreshAttempts = 0 // Reset refresh attempts on sign out
      // Clear any lingering tokens from localStorage
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("tau-auth-token")
      }
    }
  })

  return supabaseClientInstance
}

// Export a singleton instance for components that need it
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

// Enhanced auth methods with retry logic
export const enhancedAuth = {
  signIn: async (credentials: { email: string; password: string }) => {
    return withRetry(async () => {
      const result = await supabase.auth.signInWithPassword(credentials)
      if (result.error) throw result.error
      return result
    }, "auth")
  },

  signUp: async (credentials: { email: string; password: string; options?: any }) => {
    return withRetry(async () => {
      const result = await supabase.auth.signUp(credentials)
      if (result.error) throw result.error
      return result
    }, "auth")
  },

  signOut: async () => {
    return withRetry(async () => {
      const result = await supabase.auth.signOut()
      if (result.error) throw result.error
      return result
    }, "auth")
  },

  getUser: async () => {
    return withRetry(async () => {
      // First try to get the session
      const sessionResult = await supabase.auth.getSession()
      
      // If we have a valid session, use it to get the user
      if (sessionResult.data.session) {
        const result = await supabase.auth.getUser()
        if (result.error) throw result.error
        return result
      }
      
      // If no session, try to refresh it first
      try {
        const refreshResult = await enhancedAuth.refreshSession()
        if (refreshResult.data.session) {
          // Now try to get the user again with the refreshed session
          const result = await supabase.auth.getUser()
          if (result.error) throw result.error
          return result
        }
      } catch (refreshError) {
        // If refresh fails, continue with the original flow
        console.warn("Session refresh failed during getUser:", refreshError)
      }
      
      // If we still don't have a session, return the user from the original session check
      return { data: { user: null }, error: null }
    }, "auth")
  },

  refreshSession: async () => {
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      console.error("Max refresh attempts reached, redirecting to login")
      // Force sign out and redirect to login
      await supabase.auth.signOut()
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("tau-auth-token")
        window.location.href = "/login"
      }
      throw new Error("Max refresh attempts reached")
    }

    refreshAttempts++

    try {
      // First check if we even have a session to refresh
      const { data: sessionData } = await supabase.auth.getSession()
      
      // If there's no session at all, don't try to refresh it
      if (!sessionData.session) {
        console.log("No session to refresh")
        refreshAttempts = 0 // Reset attempts since this is an expected state
        return { data: { session: null, user: null }, error: null }
      }
      
      // Only try to refresh if we actually have a session
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error("Error refreshing session:", error.message)

        // If token not found or expired, try to recover by signing out and redirecting
        if (
          error.message.includes("Refresh Token Not Found") || 
          error.message.includes("expired") ||
          error.message.includes("invalid")
        ) {
          console.log("Token issue detected, cleaning up session")
          await supabase.auth.signOut()
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("tau-auth-token")
            // Only redirect if not on login page already
            if (!window.location.pathname.includes('/login')) {
              window.location.href = "/login"
            }
          }
          return { data: { session: null, user: null }, error: null }
        }

        throw error
      }

      refreshAttempts = 0 // Reset on success
      return { data, error }
    } catch (e) {
      console.error("Exception during session refresh:", e)
      // Don't throw the error, just return null session to prevent cascading errors
      return { data: { session: null, user: null }, error: e as Error }
    }
  },
}

// Enhanced data methods with retry logic
export const enhancedData = {
  from: (table: string) => {
    const query = supabase.from(table)

    // Wrap the query methods with retry logic
    const originalSelect = query.select.bind(query)
    query.select = (...args: any[]) => {
      const selectQuery = originalSelect(...args)

      const originalThen = selectQuery.then.bind(selectQuery)
      selectQuery.then = (onfulfilled, onrejected) => withRetry(() => originalThen(onfulfilled, onrejected), "api")

      return selectQuery
    }

    // Similarly wrap other methods like insert, update, delete
    // ... (implementation for other methods)

    return query
  },
}

export const sendEmailViaEdgeFunction = async (email: string, subject: string, message: string) => {
  return withRetry(async () => {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: { email, subject, message },
    })

    if (error) throw error
    return data
  }, "api")
}
