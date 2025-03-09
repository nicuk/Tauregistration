"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Notification {
  id: string
  user_id: string
  message: string
  read: boolean
  created_at: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching notifications:", error)
    } else {
      setNotifications(data || [])
      setUnreadCount(data?.filter((n) => !n.read).length || 0)
    }
  }

  async function markAsRead(notificationId: string) {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as read:", error)
    } else {
      fetchNotifications()
    }
  }

  return (
    <div className="relative">
      <Button onClick={() => setIsOpen(!isOpen)} variant="ghost">
        <Bell />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-2 py-1 text-xs">
            {unreadCount}
          </span>
        )}
      </Button>
      {isOpen && (
        <Card className="absolute right-0 mt-2 w-64 z-10">
          <CardContent className="py-2">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-2 border-b last:border-b-0 ${notification.read ? "bg-gray-100" : "bg-white"}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-gray-500">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

