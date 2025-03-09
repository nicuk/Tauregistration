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

      // Calculate the pioneer number (1-based index)
      const pioneerNumber: number = (pioneerCount || 0) + 1

      // Determine if this is a genesis pioneer (first 10,000 users)
      const isGenesisPioneer: boolean = pioneerNumber <= 10000

      // Step 3: Create the user in Auth
      try {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${requestUrl.origin}/auth/callback`,
            data: {
              username: finalUsername,
              is_pi_user: isPiUser,
              pioneer_number: pioneerNumber,
              is_genesis_pioneer: isGenesisPioneer,
              country,
              referral_source: referralSource
            }
          },
        })

        if (signUpError) {
          console.error("Error creating user:", signUpError)
          
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

        // Additional check: Make sure there's no profile with this ID already
        const { data: existingProfileWithId, error: idCheckError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .limit(1)
    
        if (idCheckError) {
          console.error("Error checking existing profile by ID:", idCheckError)
        } else if (existingProfileWithId && existingProfileWithId.length > 0) {
          // If profile exists with this ID, delete it first
          try {
            await supabaseAdmin.from("profiles").delete().eq("id", userId)
            console.log("Cleaned up existing profile with ID:", userId)
          } catch (cleanupError) {
            console.error("Error cleaning up existing profile:", cleanupError)
            // Continue anyway, the transaction might still succeed
          }
        }

        // Step 4: Create the user profile
        try {
          console.log("Creating user profile with pioneer number:", pioneerNumber);
          
          // Try using direct insert first since we know it works reliably
          try {
            console.log("Attempting direct insert to profiles table");
            
            // Get the next pioneer number if user is a Pi user
            let nextPioneerNumber = null;
            let isGenesisPioneer = false;
            
            if (isPiUser) {
              try {
                // Get the current count of pioneers directly from the profiles table
                const { count: pioneerCount, error: countError } = await supabaseAdmin
                  .from("profiles")
                  .select("*", { count: "exact", head: true })
                  .eq("is_pi_user", true);
                  
                if (countError) {
                  console.error("Error counting pioneers:", countError);
                } else {
                  const currentCount = (pioneerCount || 0) + 1;
                  nextPioneerNumber = currentCount;
                  isGenesisPioneer = currentCount <= 10000;
                  console.log(`Calculated pioneer number: ${nextPioneerNumber}, isGenesisPioneer: ${isGenesisPioneer}`);
                }
              } catch (statsError) {
                console.error("Error getting pioneer stats:", statsError);
                // Continue with registration even if stats update fails
              }
            }
            
            // If there's a referral code, look up the referrer ID first
            let referrerId = null;
            if (referralCode) {
              try {
                const { data: referrerData, error: referrerError } = await supabaseAdmin
                  .from("profiles")
                  .select("id")
                  .eq("referral_code", referralCode)
                  .single();
                  
                if (!referrerError && referrerData) {
                  referrerId = referrerData.id.toString(); // Convert UUID to string
                  console.log(`Found referrer ID ${referrerId} for referral code ${referralCode}`);
                }
              } catch (referrerLookupError) {
                console.error("Error looking up referrer ID:", referrerLookupError);
                // Continue with registration even if referrer lookup fails
              }
            }
            
            // Insert the profile
            console.log("Inserting profile with data:", {
              id: userId,
              username: finalUsername,
              is_pi_user: isPiUser,
              pioneer_number: nextPioneerNumber,
              is_genesis_pioneer: isGenesisPioneer,
              referral_code: generateUniqueReferralCode(finalUsername),
              email: email,
              country: country,
              referral_source: referralSource || null,
              total_referrals: 0,
              referred_by: referrerId
            });
            
            const { error: insertError } = await supabaseAdmin
              .from("profiles")
              .insert({
                id: userId,
                username: finalUsername,
                is_pi_user: isPiUser,
                pioneer_number: nextPioneerNumber,
                is_genesis_pioneer: isGenesisPioneer,
                referral_code: generateUniqueReferralCode(finalUsername),
                email: email,
                country: country,
                referral_source: referralSource || null,
                total_referrals: 0,
                referred_by: referrerId
              });
              
            if (insertError) {
              console.error("Direct insert failed. Error code:", insertError.code);
              console.error("Error message:", insertError.message);
              console.error("Error details:", insertError.details);
              console.error("Full error object:", JSON.stringify(insertError, null, 2));
              
              // If profile creation fails, delete the auth user to maintain consistency
              try {
                await supabaseAdmin.auth.admin.deleteUser(userId);
                console.log("Cleaned up auth user after profile creation failure");
              } catch (cleanupError) {
                console.error("Error cleaning up auth user:", cleanupError);
              }
              
              return NextResponse.json(
                { error: "Database error saving new user" },
                { status: 500 }
              );
            } else {
              console.log("Profile created successfully using direct insert");
            }
          } catch (profileCreationError) {
            console.error("Error during profile creation attempt:", profileCreationError);
            
            // If profile creation fails, delete the auth user to maintain consistency
            try {
              await supabaseAdmin.auth.admin.deleteUser(userId);
              console.log("Cleaned up auth user after profile creation failure");
            } catch (cleanupError) {
              console.error("Error cleaning up auth user:", cleanupError);
            }
            
            return NextResponse.json(
              { error: "Database error saving new user" },
              { status: 500 }
            );
          }
          
          // Step 5: Handle referral if provided
          if (referralCode) {
            try {
              console.log(`Processing referral code: ${referralCode}`);
              
              // First check if the referral code is valid
              const { data: referrerData, error: referrerError } = await supabaseAdmin
                .from("profiles")
                .select("id, total_referrals")
                .eq("referral_code", referralCode)
                .single();

              if (referrerError) {
                console.error("Error finding referrer:", referrerError);
                console.log(`Invalid referral code provided: ${referralCode}. Continuing with registration without referral.`);
                
                // Try case-insensitive match as a fallback
                try {
                  const { data: caseInsensitiveMatch } = await supabaseAdmin
                    .from("profiles")
                    .select("id, total_referrals, referral_code")
                    .ilike("referral_code", referralCode)
                    .limit(1);
                    
                  if (caseInsensitiveMatch && caseInsensitiveMatch.length > 0) {
                    console.log(`Found case-insensitive match for referral code: ${caseInsensitiveMatch[0].referral_code}`);
                  } else {
                    console.log("No case-insensitive match found either");
                  }
                } catch (fallbackError) {
                  console.error("Error in fallback referral code lookup:", fallbackError);
                }
              } else if (referrerData) {
                // Prevent self-referrals
                if (referrerData.id === userId) {
                  console.log("Self-referral detected, skipping referral creation")
                } else {
                  // Check if this referral already exists to prevent duplicates
                  const { data: existingReferral, error: checkReferralError } = await supabaseAdmin
                    .from("referrals")
                    .select("id")
                    .eq("referrer_id", referrerData.id)
                    .eq("referred_id", userId)
                    .limit(1)
                  
                  if (checkReferralError) {
                    console.error("Error checking existing referral:", checkReferralError)
                  } else if (!existingReferral || existingReferral.length === 0) {
                    // Only create the referral if it doesn't already exist
                    try {
                      // First update the referred_by field in the user's profile
                      try {
                        const referrerIdString = referrerData.id.toString();
                        console.log(`Updating referred_by field with string value: ${referrerIdString}`);
                        
                        const { error: updateReferredByError } = await supabaseAdmin
                          .from("profiles")
                          .update({ referred_by: referrerIdString })
                          .eq("id", userId);

                        if (updateReferredByError) {
                          console.error("Error updating referred_by field:", updateReferredByError);
                          console.error("Error code:", updateReferredByError.code);
                          console.error("Error message:", updateReferredByError.message);
                          console.error("Error details:", updateReferredByError.details);
                          // Continue with registration even if updating referred_by fails
                        } else {
                          console.log(`Successfully updated referred_by field for user ${userId} to referrer ${referrerIdString}`);
                          
                          // Only create the referral record if the referred_by update was successful
                          const { error: createReferralError } = await supabaseAdmin
                            .from("referrals")
                            .insert({
                              referrer_id: referrerData.id,
                              referred_id: userId
                            });

                          if (createReferralError) {
                            console.error("Error creating referral record:", createReferralError);
                            // Continue with registration even if referral creation fails
                          } else {
                            console.log("Successfully created referral record");
                            
                            // Only update the referrer's count if the referral was successfully created
                            try {
                              const newReferralCount = (referrerData.total_referrals || 0) + 1;
                              const { error: updateReferrerError } = await supabaseAdmin
                                .from("profiles")
                                .update({ total_referrals: newReferralCount })
                                .eq("id", referrerData.id);

                              if (updateReferrerError) {
                                console.error("Error updating referrer stats:", updateReferrerError);
                              } else {
                                console.log(`Successfully updated referrer's total_referrals to ${newReferralCount}`);
                              }
                            } catch (updateError) {
                              console.error("Exception updating referrer stats:", updateError);
                            }
                          }
                        }
                      } catch (updateError) {
                        console.error("Exception updating referred_by field:", updateError);
                      }
                    } catch (insertError) {
                      console.error("Exception creating referral record:", insertError);
                    }
                  } else {
                    console.log("Referral already exists, skipping creation");
                  }
                }
              }
            } catch (referralError) {
              console.error("Error processing referral:", referralError);
              // Non-blocking error - continue with registration
            }
          }

          // Step 6: Update pioneer stats
          // First, check if pioneer_stats_table has a record
          const { data: existingStatsData, error: statsCheckError } = await supabaseAdmin
            .from("pioneer_stats_table")
            .select("*")
            .single()

          if (statsCheckError && statsCheckError.code !== "PGRST116") {
            console.error("Error checking pioneer stats:", statsCheckError)
          }

          // If no record exists or there was an error, create/update the stats
          if (!existingStatsData || statsCheckError) {
            // Try to create a new record if none exists
            const { error: insertStatsError } = await supabaseAdmin
              .from("pioneer_stats_table")
              .insert({
                id: 1,
                total_pioneers: 1,
                genesis_pioneers: isGenesisPioneer ? 1 : 0
              })
              .onConflict("id")
              .merge()

            if (insertStatsError) {
              console.error("Error creating pioneer stats:", insertStatsError)
            }
          } else {
            // Update existing record
            const { error: updateStatsError } = await supabaseAdmin
              .from("pioneer_stats_table")
              .update({
                total_pioneers: existingStatsData.total_pioneers + 1,
                genesis_pioneers: isGenesisPioneer 
                  ? existingStatsData.genesis_pioneers + 1 
                  : existingStatsData.genesis_pioneers
              })
              .eq("id", 1)

            if (updateStatsError) {
              console.error("Error updating pioneer stats:", updateStatsError)
            }
          }

          return NextResponse.json(
            {
              message: "User created successfully",
              pioneerNumber,
              isGenesisPioneer
            },
            { status: 201 }
          )
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
  // Create a base for the referral code using the username (first 3 chars)
  const baseCode = username.slice(0, 3).toUpperCase();
  
  // Add a timestamp component to ensure uniqueness
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  
  // Add a random component (4 characters)
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  // Combine all parts to create a unique referral code
  return `${baseCode}${timestamp}${randomChars}`;
}
