"use client"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { AlertCircle, RefreshCw } from "lucide-react"

interface FallbackMessageProps {
  onRetry: () => void
  error?: string
}

export function FallbackMessage({ onRetry, error }: FallbackMessageProps) {
  return (
    <Card className="border-red-100 bg-red-50 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-red-700 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          Connection Issue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-red-600 mb-2">
          {error ||
            "We couldn't connect to the AI assistant. This could be due to an API key issue or a temporary service disruption."}
        </p>
        <ul className="list-disc pl-5 text-sm text-red-600">
          <li>Check if your OpenAI API key is valid and has sufficient credits</li>
          <li>Verify your internet connection</li>
          <li>The service might be experiencing high traffic</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
          onClick={onRetry}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </CardFooter>
    </Card>
  )
}
