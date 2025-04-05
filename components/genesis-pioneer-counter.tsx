"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"

export function GenesisPioneerCounter() {
  const [stats, setStats] = useState({
    total_pioneers: 0,
    genesis_pioneers: 0,
    max_genesis_pioneers: 10000,
    additional_pioneers: 0
  })
  const [statusMessage, setStatusMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // First try to get the formatted message
        const { data: messageData, error: messageError } = await supabase.rpc('get_pioneer_status_message')
        
        if (messageData && !messageError) {
          setStatusMessage(messageData)
        }
        
        // Try to use the new get_extended_pioneer_stats function
        const { data, error } = await supabase.rpc('get_extended_pioneer_stats')
        
        if (data && !error) {
          // New function successful
          setStats({
            total_pioneers: data.total_pioneers || 0,
            genesis_pioneers: data.genesis_pioneers || 0,
            max_genesis_pioneers: 10000,
            additional_pioneers: Math.max(0, (data.total_registrations || 0) - 10000)
          })
        } else {
          // Fallback to the old method if API fails
          const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true })
          const { count: genesisCount } = await supabase.from("profiles")
            .select("*", { count: "exact", head: true })
            .lte("pioneer_number", 10000)
          
          setStats({
            total_pioneers: count || 0,
            genesis_pioneers: genesisCount || 0,
            max_genesis_pioneers: 10000,
            additional_pioneers: Math.max(0, (count || 0) - 10000)
          })
        }
      } catch (error) {
        console.error("Error fetching pioneer stats:", error)
        // Fallback to the old method if API fails
        try {
          const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true })
          const { count: genesisCount } = await supabase.from("profiles")
            .select("*", { count: "exact", head: true })
            .lte("pioneer_number", 10000)
          
          setStats({
            total_pioneers: count || 0,
            genesis_pioneers: genesisCount || 0,
            max_genesis_pioneers: 10000,
            additional_pioneers: Math.max(0, (count || 0) - 10000)
          })
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
        setStats((prev) => {
          const newTotal = prev.total_pioneers + 1
          return {
            ...prev,
            total_pioneers: newTotal,
            additional_pioneers: Math.max(0, newTotal - 10000)
          }
        })
        
        // Update the status message when a new user joins
        if (stats.genesis_pioneers >= 10000) {
          setStatusMessage(`10,000/10,000 Genesis Pioneers! ${stats.additional_pioneers + 1} additional pioneers have joined since!`)
        }
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

  // If we have a status message from the backend, use it
  if (statusMessage) {
    return (
      <div className="text-center">
        <div className="font-bold">{statusMessage}</div>
      </div>
    )
  }

  // All Genesis Pioneer slots are filled
  if (stats.genesis_pioneers >= 10000) {
    return (
      <div className="text-center">
        <div className="font-bold text-lg">
          {formatNumber(10000)}/{formatNumber(stats.max_genesis_pioneers)} Genesis Pioneers
        </div>
        <div className="text-sm mt-1">
          <span className="text-primary font-semibold">+{formatNumber(stats.additional_pioneers)}</span> additional pioneers have joined!
        </div>
      </div>
    )
  }

  // Some Genesis Pioneer slots still available (fallback, shouldn't happen anymore)
  return (
    <div>
      <span className="font-bold">{loading ? "..." : formatNumber(stats.genesis_pioneers)}</span> of{" "}
      {formatNumber(stats.max_genesis_pioneers)} Genesis Pioneers
    </div>
  )
}
