"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"

export function GenesisPioneerCounter() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true })

        if (error) throw error
        setCount(count || 0)
      } catch (error) {
        console.error("Error fetching pioneer count:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCount()

    // Set up real-time subscription
    const subscription = supabase
      .channel("public:profiles")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => {
        setCount((prev) => prev + 1)
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <div>
      <span className="font-bold">{loading ? "..." : count.toLocaleString()}</span> of 10,000 Genesis Pioneers
    </div>
  )
}

