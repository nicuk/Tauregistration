import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import Navigation from "@/components/navigation"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "TAU Network - Join as a Pioneer",
  description: "Join TAU Network as a Genesis Pioneer and start mining TAU cryptocurrency",
  icons: {
    icon: [
      {
        url: "/tau-logo-new.svg",
        sizes: "32x32",
        type: "image/svg+xml",
      },
      {
        url: "/tau-logo-new.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/tau-logo-new.svg",
    apple: {
      url: "/tau-logo-new.svg",
      sizes: "180x180",
      type: "image/svg+xml",
    },
    other: [
      {
        rel: "icon",
        url: "/tau-logo-new.svg",
      },
    ],
  },
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        {children}
      </body>
    </html>
  )
}



import './globals.css'