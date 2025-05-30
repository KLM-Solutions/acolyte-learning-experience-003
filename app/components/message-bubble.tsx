"use client"
import { Avatar } from "@/app/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Reference } from "../types"
import { motion } from "framer-motion"

interface MessageBubbleProps {
  id: string
  content: string
  role: "user" | "assistant"
  isCurrentlyReading: boolean
  onReadMessage: (id: string, content: string) => void
  onStopReading: () => void
}

export function MessageBubble({
  id,
  content,
  role,
  isCurrentlyReading,
  onReadMessage,
  onStopReading,
}: MessageBubbleProps) {
  // Extract references if they exist in the message
  let messageContent = content
  let references: Reference[] = []

  // Check if the message contains references in the specified format
  const referencesMatch = messageContent.match(/\[REFERENCES\]([\s\S]*?)\[\/REFERENCES\]/i)

  if (referencesMatch && referencesMatch[1]) {
    try {
      // Extract and parse the references JSON
      const referencesJson = referencesMatch[1].trim()
      references = JSON.parse(referencesJson)

      // Remove the references section from the displayed message
      messageContent = messageContent.replace(/\[REFERENCES\]([\s\S]*?)\[\/REFERENCES\]/i, "")
    } catch (error) {
      console.error("Failed to parse references:", error)
    }
  }

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
        {role === "assistant" && (
          <Avatar className="mr-3 h-10 w-10 border-2 border-white shadow-sm">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-full h-full flex items-center justify-center text-white font-medium">
              AI
            </div>
          </Avatar>
        )}
        <div
          className={cn(
            "max-w-[80%] p-4 rounded-xl group relative",
            role === "user"
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-none shadow-md"
              : "bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-md",
            isCurrentlyReading && "ring-2 ring-offset-2 ring-blue-400",
          )}
        >
          <div className="whitespace-pre-wrap">{messageContent}</div>

          {/* Text-to-speech button */}
          <div
            className={cn(
              "absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity",
              isCurrentlyReading && "opacity-100",
            )}
          >
            <Button
              size="icon"
              variant={isCurrentlyReading ? "destructive" : "secondary"}
              className="h-8 w-8 rounded-full shadow-md"
              onClick={() => (isCurrentlyReading ? onStopReading() : onReadMessage(id, messageContent))}
              aria-label={isCurrentlyReading ? "Stop reading" : "Read message aloud"}
            >
              {isCurrentlyReading ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {role === "user" && (
          <Avatar className="ml-3 h-10 w-10 border-2 border-white shadow-sm">
            <div className="bg-gradient-to-br from-green-500 to-green-600 w-full h-full flex items-center justify-center text-white font-medium">
              You
            </div>
          </Avatar>
        )}
      </div>

      {/* References */}
      {references.length > 0 && (
        <div className={cn("mt-3", role === "user" ? "mr-12" : "ml-12")}>
          <p className="text-sm text-gray-500 mb-2 font-medium">Helpful resources:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {references.map((ref, index) => (
              <Card key={index} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="p-3 bg-gradient-to-r from-gray-50 to-gray-100">
                  <CardTitle className="text-sm">{ref.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <img src={ref.url || "/placeholder.svg"} alt={ref.title} className="w-full h-32 object-cover" />
                  <p className="text-xs text-gray-500 p-3">{ref.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
