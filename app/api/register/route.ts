import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

// Create a Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Parse the request body
    const formData = await request.json()
    const email = formData.email
    const password = formData.password
    const username = formData.username
    const isPiUser = formData.isPiUser || false
    const referralCode = formData.referralCode || null
    const country = formData.country || null
    const referralSource = formData.referralSource || null

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    // Check if the email already exists
    try {
      const { data: existingUsers, error: emailCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1)

      if (emailCheckError) {
        console.error("Error checking existing email:", emailCheckError)
      } else if (existingUsers && existingUsers.length > 0) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        )
      }
    } catch (emailCheckErr) {
      console.error("Exception checking email:", emailCheckErr)
      // Continue with registration - we'll let Supabase handle the uniqueness constraint
    }

    // Use the provided username or generate one based on the email
    const finalUsername = username || email.split('@')[0] + Math.floor(Math.random() * 1000);

    // Check if username already exists
    try {
      const { data: existingUsername, error: usernameCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", finalUsername)
        .limit(1)
        
      if (!usernameCheckError && existingUsername && existingUsername.length > 0) {
        // Username exists, return an error to the user
        return NextResponse.json(
          { error: "username_already_exists", message: "This username is already taken. Please choose a different username." },
          { status: 400 }
        )
      }
    } catch (usernameCheckErr) {
      console.error("Exception checking username:", usernameCheckErr);
      // Continue with registration
    }

    // Generate a unique referral code for this user
    const userReferralCode = generateUniqueReferralCode(finalUsername)

    // Step 1: Check if email already exists
    try {
      // First, ensure the pioneer_stats_table is initialized
      const { data: statsTableCheck, error: statsCheckError } = await supabaseAdmin
        .from("pioneer_stats_table")
        .select("id")
        .eq("id", 1)
        .single();
        
      if (statsCheckError || !statsTableCheck) {
        console.log("pioneer_stats_table needs initialization, creating row with ID=1");
        const { error: statsInitError } = await supabaseAdmin
          .from("pioneer_stats_table")
          .insert({
            id: 1,
            total_pioneers: 0,
            genesis_pioneers: 0,
            updated_at: new Date().toISOString()
          });
          
        if (statsInitError) {
          console.error("Failed to initialize pioneer_stats_table:", statsInitError);
          // Continue anyway, as the table might have been initialized by another process
        } else {
          console.log("Successfully initialized pioneer_stats_table");
        }
      }
      
      // Now check if the email already exists
      const { data: existingProfilesByEmail, error: emailCheckError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1)
    
      if (emailCheckError) {
        console.error("Error checking existing profiles by email:", emailCheckError)
        return NextResponse.json(
          { error: "Error checking user existence" },
          { status: 500 }
        )
      }

      if (existingProfilesByEmail && existingProfilesByEmail.length > 0) {
        return NextResponse.json(
          { error: "email_already_registered", message: "This email address is already registered. Please use a different email or try logging in." },
          { status: 400 }
        )
      }

      // Step 2: Get the current count of pioneers for assigning the next pioneer number
      const { count: pioneerCount, error: countError } = await supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true })

      if (countError) {
        console.error("Error counting pioneers:", countError)
        return NextResponse.json(
          { error: "Error determining pioneer number" },
          { status: 500 }
        )
      }

      // Step 3: Create the user in Auth
      try {
        console.log("Attempting to create auth user with email:", email);
        
        // Simplify the metadata we're storing in auth.users
        // Only store essential information to avoid potential size limits
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${requestUrl.origin}/auth/callback`,
            data: {
              username: finalUsername,
              // Remove non-essential metadata from auth.users
              // This data will be stored in the profiles table instead
            }
          },
        })

        if (signUpError) {
          console.error("Error creating user:", signUpError)
          console.error("Error code:", signUpError.code)
          console.error("Error message:", signUpError.message)
          console.error("Error status:", signUpError.status)
          console.error("Error details:", JSON.stringify(signUpError, null, 2))
          
          // Provide more specific error messages based on Supabase error codes
          if (signUpError.message.includes("email")) {
            return NextResponse.json(
              { error: "Invalid email or email already in use" },
              { status: 400 }
            )
          } else if (signUpError.message.includes("password")) {
            return NextResponse.json(
              { error: "Password does not meet requirements" },
              { status: 400 }
            )
          } else {
            return NextResponse.json(
              { error: signUpError.message || "Error creating user" },
              { status: signUpError.status || 500 }
            )
          }
        }

        if (!authData.user) {
          console.error("No user returned from signUp")
          return NextResponse.json(
            { error: "Failed to create user account" },
            { status: 500 }
          )
        }

        const userId = authData.user.id

        // Step 4: Use our new safe registration function to create the profile
        // This replaces all the direct SQL operations with a single function call
        // that handles race conditions and retries
        try {
          console.log("Creating user profile using api_register_user_safe function");
          
          const { data: profileData, error: profileError } = await supabaseAdmin.rpc(
            'api_register_user_safe',
            {
              p_username: finalUsername,
              p_email: email,
              p_referral_code: referralCode,
              p_country: country,
              p_referral_source: referralSource
            }
          );
          
          if (profileError) {
            console.error("Error creating profile with api_register_user_safe:", profileError);
            console.error("Error details:", JSON.stringify(profileError, null, 2));
            
            // If profile creation fails, delete the auth user to maintain consistency
            try {
              await supabaseAdmin.auth.admin.deleteUser(userId);
              console.log("Cleaned up auth user after profile creation failure");
            } catch (cleanupError) {
              console.error("Error cleaning up auth user:", cleanupError);
            }
            
            return NextResponse.json(
              { error: "Database error updating user" },
              { status: 500 }
            );
          }
          
          console.log("Profile created successfully using api_register_user_safe");
          console.log("Profile data:", JSON.stringify(profileData, null, 2));
          
          // Return success response
          return NextResponse.json({
            success: true,
            message: "User registered successfully",
            userId: userId,
            username: finalUsername,
            email: email
          })
        } catch (profileCreationError) {
          console.error("Exception during profile creation:", profileCreationError);
          
          // If profile creation fails, delete the auth user to maintain consistency
          try {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            console.log("Cleaned up auth user after profile creation exception");
          } catch (cleanupError) {
            console.error("Error cleaning up auth user:", cleanupError);
          }
          
          return NextResponse.json(
            { error: "Database error updating user" },
            { status: 500 }
          );
        }
      } catch (error: any) {
        console.error("Registration error:", error)
        
        // Try to clean up the auth user if profile creation failed
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId)
        } catch (cleanupError) {
          console.error("Error cleaning up auth user after failed registration:", cleanupError)
        }
        
        return NextResponse.json(
          { error: error.message || "An unexpected error occurred during registration" },
          { status: 500 }
        )
      }
    } catch (error: any) {
      console.error("Unexpected error in registration process:", error)
      return NextResponse.json(
        { error: "Registration failed: " + error.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Unexpected error in registration process:", error)
    return NextResponse.json(
      { error: "Registration failed: " + error.message },
      { status: 500 }
    )
  }
}

// Function to generate a unique referral code
function generateUniqueReferralCode(username: string): string {
  // Use "TAU" as the prefix for all referral codes
  const baseCode = "TAU";
  
  // Add a timestamp component to ensure uniqueness
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  
  // Add a random component (4 characters)
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  // Combine all parts to create a unique referral code
  return `${baseCode}${timestamp}${randomChars}`;
}
