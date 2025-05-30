"use client"

import { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"
import { Textarea } from "@/app/components/ui/textarea"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function AdminPage() {
  const [heading, setHeading] = useState("")
  const [description, setDescription] = useState("")
  const [readymadeSystemMessage, setReadymadeSystemMessage] = useState("")
  const [buildSystemMessage, setBuildSystemMessage] = useState("")
  const [reviewSystemMessage, setReviewSystemMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Fetch existing content when the page loads
    fetchContent()
  }, [])

  const fetchContent = async () => {
    try {
      const response = await fetch('/api/admin')
      const data = await response.json()
      
      if (data) {
        setHeading(data.heading)
        setDescription(data.description)
        setReadymadeSystemMessage(data.readymade_system_message)
        setBuildSystemMessage(data.build_system_message)
        setReviewSystemMessage(data.review_system_message)
      }
    } catch (err) {
      console.error('Error fetching content:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          heading,
          description,
          readymadeSystemMessage,
          buildSystemMessage,
          reviewSystemMessage,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update content')
      }

      setSuccess('Content updated successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Manage Hero Content</CardTitle>
          <CardDescription>
            Update the heading, description, and system messages for each mode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="heading" className="text-sm font-medium">
                Heading
              </label>
              <Input
                id="heading"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="Enter heading"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="reviewSystemMessage" className="text-sm font-medium">
                Review & Relate System Message
              </label>
              <Textarea
                id="reviewSystemMessage"
                value={reviewSystemMessage}
                onChange={(e) => setReviewSystemMessage(e.target.value)}
                placeholder="Enter system message for Review & Relate"
                required
                className="min-h-[200px]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="readymadeSystemMessage" className="text-sm font-medium">
                Ready-Made Scenarios System Message
              </label>
              <Textarea
                id="readymadeSystemMessage"
                value={readymadeSystemMessage}
                onChange={(e) => setReadymadeSystemMessage(e.target.value)}
                placeholder="Enter system message for Ready-Made Scenarios"
                required
                className="min-h-[200px]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="buildSystemMessage" className="text-sm font-medium">
                Build Your Own Scenario System Message
              </label>
              <Textarea
                id="buildSystemMessage"
                value={buildSystemMessage}
                onChange={(e) => setBuildSystemMessage(e.target.value)}
                placeholder="Enter system message for Build Your Own Scenario"
                required
                className="min-h-[200px]"
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 