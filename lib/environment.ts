export function getEnvironmentConfig() {
  // Detect environment
  const isV0Preview = typeof window !== "undefined" && window.location.hostname.includes("v0.dev")
  const isDevelopment = process.env.NODE_ENV === "development"

  return {
    isV0Preview,
    isDevelopment,
    baseUrl: isV0Preview
      ? "https://taumine.vercel.app"
      : typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000",
    authRedirectUrl: isV0Preview
      ? "https://taumine.vercel.app/auth/callback"
      : typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "http://localhost:3000/auth/callback",
  }
}

