import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Bot detection configuration
const BOT_PROTECTION = {
  // Block these user agents completely
  blockedUserAgents: ['node', 'python-requests', 'go-http-client', 'curl', 'wget'],
  
  // Block these IP ranges (AWS and other cloud providers often used by bots)
  blockedIpRanges: [
    // Amazon AWS IP ranges that were in your logs
    '3.234.208.',  // Partial match for 3.234.208.100
    '13.233.69.',  // Partial match for 13.233.69.58
    
    // Add more as needed based on your logs
  ],
  
  // Rate limiting configuration
  rateLimit: {
    // Store IP addresses and their request counts
    ipRequests: new Map<string, { count: number, timestamp: number }>(),
    // Maximum requests per window
    maxRequests: 20,
    // Time window in milliseconds (1 minute)
    windowMs: 60 * 1000,
    // Clean up the map every 5 minutes
    cleanup: function() {
      const now = Date.now();
      for (const [ip, data] of this.ipRequests.entries()) {
        if (now - data.timestamp > this.windowMs) {
          this.ipRequests.delete(ip);
        }
      }
    }
  }
};

// Set up a cleanup interval for the rate limiting map
if (typeof window === 'undefined') { // Only run on server
  setInterval(() => {
    BOT_PROTECTION.rateLimit.cleanup();
  }, 5 * 60 * 1000); // Every 5 minutes
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const ip = req.ip || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  
  // 1. Check for blocked user agents
  if (BOT_PROTECTION.blockedUserAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    console.log(`Blocked request from suspicious user agent: ${userAgent}`);
    return new NextResponse(JSON.stringify({ error: 'Access denied' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 2. Check for blocked IP ranges
  if (BOT_PROTECTION.blockedIpRanges.some(range => ip.startsWith(range))) {
    console.log(`Blocked request from suspicious IP: ${ip}`);
    return new NextResponse(JSON.stringify({ error: 'Access denied' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 3. Apply rate limiting
  const rateLimit = BOT_PROTECTION.rateLimit;
  const now = Date.now();
  
  if (!rateLimit.ipRequests.has(ip)) {
    rateLimit.ipRequests.set(ip, { count: 1, timestamp: now });
  } else {
    const data = rateLimit.ipRequests.get(ip)!;
    
    // Reset if outside window
    if (now - data.timestamp > rateLimit.windowMs) {
      rateLimit.ipRequests.set(ip, { count: 1, timestamp: now });
    } 
    // Increment if within window
    else {
      data.count++;
      
      // Block if over limit
      if (data.count > rateLimit.maxRequests) {
        console.log(`Rate limited IP: ${ip} with ${data.count} requests`);
        return new NextResponse(JSON.stringify({ error: 'Too many requests' }), { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        });
      }
    }
  }
  
  // Create a new supabase middleware client on each request
  const supabase = createMiddlewareClient({ req, res })
  
  try {
    // Get the session with proper error handling
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    
    if (error) {
      console.error("Middleware session error:", error.message)
      // Don't redirect on error, just continue to the page and let client-side handle it
      return res
    }

    // If there's no session and the user is trying to access protected pages, redirect to the registration page
    if (!session && req.nextUrl.pathname.startsWith("/welcome")) {
      return NextResponse.redirect(new URL("/register", req.url))
    }

    // If there's a session and the user is trying to access register or root, redirect to welcome
    if (session && (req.nextUrl.pathname === "/register" || req.nextUrl.pathname === "/")) {
      return NextResponse.redirect(new URL("/welcome", req.url))
    }

    return res
  } catch (err) {
    console.error("Unexpected middleware error:", err)
    // On unexpected errors, just continue to the requested page
    return res
  }
}

export const config = {
  matcher: ["/(.*)", "/api/(.*)"],
}
