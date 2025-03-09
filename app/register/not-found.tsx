import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Invalid Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            The referral code in your link appears to be invalid or has expired. Please check with the person who shared
            the link with you or continue without a referral code.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" asChild>
            <Link href="/">Continue Without Referral</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

