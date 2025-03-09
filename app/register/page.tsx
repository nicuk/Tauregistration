import { Suspense } from "react"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import RegistrationForm from "@/components/registration-form"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

async function getReferrerInfo(referralCode: string) {
  const supabase = createServerSupabaseClient()

  const { data: referrer, error } = await supabase
    .from("profiles")
    .select("username, total_referrals, referral_rewards")
    .eq("referral_code", referralCode)
    .single()

  if (error || !referrer) {
    return null
  }

  return referrer
}

interface PageProps {
  searchParams: { ref?: string }
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const referralCode = searchParams.ref
  let referrerInfo = null

  if (referralCode) {
    referrerInfo = await getReferrerInfo(referralCode)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </CardContent>
            </Card>
          }
        >
          <RegistrationForm referralCode={referralCode} referrerInfo={referrerInfo} />
        </Suspense>
      </div>
    </div>
  )
}

