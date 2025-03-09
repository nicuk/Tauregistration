export function generateReferralCode(username: string): string {
  // Create a base string from username and timestamp
  const baseString = `${username}-${Date.now()}`

  // Create a hash of the base string
  const hash = Array.from(new Uint8Array(new TextEncoder().encode(baseString))).reduce((h, b) => (h << 5) - h + b, 0)

  // Convert to a 6-character alphanumeric code
  const code = Math.abs(hash).toString(36).slice(0, 6).toUpperCase()

  return code
}

