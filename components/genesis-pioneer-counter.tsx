"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"

export function GenesisPioneerCounter() {
  const [stats, setStats] = useState({
    total_pioneers: 0,
    genesis_pioneers: 0,
    max_genesis_pioneers: 10000
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // First try to use the new API endpoint
        const response = await fetch('/api/pioneer-stats')
        if (response.ok) {
          const data = await response.json()
          setStats({
            total_pioneers: data.total_pioneers || 0,
            genesis_pioneers: data.genesis_pioneers || 0,
            max_genesis_pioneers: data.max_genesis_pioneers || 10000
          })
        } else {
          // Fallback to the old method if API fails
          const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true })
          if (error) throw error
          setStats(prev => ({
            ...prev,
            total_pioneers: count || 0
          }))
        }
      } catch (error) {
        console.error("Error fetching pioneer stats:", error)
        // Fallback to the old method if API fails
        try {
          const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true })
          if (error) throw error
          setStats(prev => ({
            ...prev,
            total_pioneers: count || 0
          }))
        } catch (innerError) {
          console.error("Error in fallback fetch:", innerError)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Set up real-time subscription
    const subscription = supabase
      .channel("public:profiles")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => {
        setStats((prev) => ({
          ...prev,
          total_pioneers: prev.total_pioneers + 1
        }))
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  return (
    <div>
      <span className="font-bold">{loading ? "..." : formatNumber(stats.total_pioneers)}</span> of{" "}
      {formatNumber(stats.max_genesis_pioneers)} Genesis Pioneers
    </div>
  )
}
