"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UseSpeechOptions {
  rate?: number
  pitch?: number
  volume?: number
  voice?: string
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const [speaking, setSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [currentText, setCurrentText] = useState<string | null>(null)
  const speechSynthRef = useRef<SpeechSynthesis | null>(null)

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined") {
      speechSynthRef.current = window.speechSynthesis

      // Get available voices
      const loadVoices = () => {
        const availableVoices = speechSynthRef.current?.getVoices() || []
        setVoices(availableVoices)
      }

      // Chrome loads voices asynchronously
      if (speechSynthRef.current?.onvoiceschanged !== undefined) {
        speechSynthRef.current.onvoiceschanged = loadVoices
      }

      loadVoices()

      // Clean up
      return () => {
        if (speechSynthRef.current?.speaking) {
          speechSynthRef.current.cancel()
        }
      }
    }
  }, [])

  // Stop speaking
  const stop = useCallback(() => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel()
      setSpeaking(false)
      setCurrentText(null)
    }
  }, [])

  // Speak text
  const speak = useCallback(
    (text: string) => {
      if (!speechSynthRef.current) return

      // Stop any ongoing speech
      stop()

      // Clean the text (remove markdown, code blocks, etc.)
      const cleanText = text
        .replace(/```[\s\S]*?```/g, "Code block omitted.")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[REFERENCES\][\s\S]*?\[\/REFERENCES\]/i, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/\[(.*?)\]$$(.*?)$$/g, "$1")

      const utterance = new SpeechSynthesisUtterance(cleanText)

      // Set options
      utterance.rate = options.rate || 1
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume || 1

      // Set voice if specified
      if (options.voice && voices.length > 0) {
        const selectedVoice = voices.find((v) => v.name === options.voice)
        if (selectedVoice) {
          utterance.voice = selectedVoice
        }
      }

      // Handle events
      utterance.onstart = () => {
        setSpeaking(true)
        setCurrentText(text)
      }

      utterance.onend = () => {
        setSpeaking(false)
        setCurrentText(null)
      }

      utterance.onerror = () => {
        setSpeaking(false)
        setCurrentText(null)
      }

      // Speak
      speechSynthRef.current.speak(utterance)
    },
    [stop, voices, options],
  )

  return {
    speak,
    stop,
    speaking,
    voices,
    currentText,
  }
}
