import SupabaseConnectionTest from "@/components/supabase-connection-test"
import DebugEnv from "@/components/debug-env"

export default function TestConnectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-700 flex flex-col items-center justify-center p-4 gap-4">
      <DebugEnv />
      <SupabaseConnectionTest />
    </div>
  )
}

