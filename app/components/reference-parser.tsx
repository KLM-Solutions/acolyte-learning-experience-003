"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import type { Reference } from "../types"

interface ReferenceParserProps {
  content: string
}

export function ReferenceParser({ content }: ReferenceParserProps) {
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
    <>
      {messageContent}

      {/* References */}
      {references.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-gray-500 mb-2">Helpful resources:</p>
          <div className="flex overflow-x-auto space-x-4 pb-2">
            {references.map((ref, index) => (
              <Card key={index} className="min-w-[250px] max-w-[250px] flex-shrink-0">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">{ref.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <img
                    src={ref.url || "/placeholder.svg"}
                    alt={ref.title}
                    className="w-full h-32 object-cover rounded-md mb-2"
                  />
                  <p className="text-xs text-gray-500">{ref.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
