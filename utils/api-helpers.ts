/**
 * Utility functions for API requests with rate limiting and retry logic
 */

// Configuration for retry logic
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  factor: 2, // Exponential backoff factor
}

// Rate limiting configuration
const RATE_LIMITS = {
  auth: {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // Max 10 requests per minute for auth operations
  },
  api: {
    windowMs: 60000, // 1 minute
    maxRequests: 30, // Max 30 requests per minute for general API calls
  },
}

// Track request timestamps for rate limiting
const requestTimestamps = {
  auth: [] as number[],
  api: [] as number[],
}

/**
 * Check if we've hit the rate limit for a specific operation type
 */
export function checkRateLimit(type: "auth" | "api"): boolean {
  const now = Date.now()
  const config = RATE_LIMITS[type]

  // Clean up old timestamps
  requestTimestamps[type] = requestTimestamps[type].filter((timestamp) => now - timestamp < config.windowMs)

  // Check if we've hit the limit
  if (requestTimestamps[type].length >= config.maxRequests) {
    return true // Rate limit hit
  }

  // Record this request
  requestTimestamps[type].push(now)
  return false // Rate limit not hit
}

/**
 * Wait for a specified delay
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate backoff delay for retries
 */
function getBackoffDelay(attempt: number): number {
  const delay = Math.min(RETRY_CONFIG.maxDelay, RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.factor, attempt))
  // Add some jitter to prevent all clients retrying simultaneously
  return delay * (0.8 + Math.random() * 0.4)
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  type: "auth" | "api" = "api",
  customConfig?: Partial<typeof RETRY_CONFIG>,
): Promise<T> {
  const config = { ...RETRY_CONFIG, ...customConfig }
  let lastError: any

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Check rate limit before making the request
      if (checkRateLimit(type)) {
        const delay = getBackoffDelay(attempt)
        console.log(`Rate limit hit for ${type}, waiting ${delay}ms before retry`)
        await wait(delay)
        continue
      }

      return await fn()
    } catch (error: any) {
      lastError = error

      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error
      }

      // If we've used all retries, throw the last error
      if (attempt === config.maxRetries) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = getBackoffDelay(attempt)
      console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`, error)
      await wait(delay)
    }
  }

  throw lastError
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
    return true
  }

  // Rate limit errors are retryable
  if (error?.message?.includes("rate limit") || error?.code === 429) {
    return true
  }

  // Some auth errors might be retryable
  if (error?.message?.includes("Invalid Refresh Token") || error?.message?.includes("Refresh Token Not Found")) {
    return false // These require user intervention
  }

  // Server errors are retryable
  if (error?.status >= 500 && error?.status < 600) {
    return true
  }

  return false
}

/**
 * Enhanced fetch with retry logic
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  type: "auth" | "api" = "api",
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, options)

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(errorData.message || `HTTP error ${response.status}`)
      ;(error as any).status = response.status
      ;(error as any).data = errorData
      throw error
    }

    return response
  }, type)
}

