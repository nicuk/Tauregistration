import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
            <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

