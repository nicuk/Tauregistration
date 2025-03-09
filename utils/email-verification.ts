import { createClientSupabaseClient } from "@/lib/supabase-client"

export const resendVerificationEmail = async (email: string) => {
  const supabase = createClientSupabaseClient()

  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("Error resending verification email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resend verification email",
    }
  }
}

export const checkEmailVerification = async () => {
  const supabase = createClientSupabaseClient()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) throw error

    return {
      verified: user?.email_confirmed_at ? true : false,
      email: user?.email,
    }
  } catch (error) {
    console.error("Error checking email verification:", error)
    return { verified: false, email: null }
  }
}

