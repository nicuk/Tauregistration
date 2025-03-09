import { Suspense } from "react"
import ClientHome from "./client-home"

export default function Home() {
  return (
    <Suspense
      fallback={<div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>}
    >
      <ClientHome />
    </Suspense>
  )
}

