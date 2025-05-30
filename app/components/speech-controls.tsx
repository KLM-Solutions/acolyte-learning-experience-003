"use client"

import { Button } from "@/app/components/ui/button"
import { VolumeX, Settings, Volume2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu"
import { Slider } from "@/app/components/ui/slider"
import { useState } from "react"
import { Badge } from "@/app/components/ui/badge"

interface SpeechControlsProps {
  voices: SpeechSynthesisVoice[]
  onVoiceChange: (voice: string) => void
  onRateChange: (rate: number) => void
  onPitchChange: (pitch: number) => void
  onVolumeChange: (volume: number) => void
  speaking: boolean
  onStopAll: () => void
  selectedVoice: string
  rate: number
  pitch: number
  volume: number
}

export function SpeechControls({
  voices,
  onVoiceChange,
  onRateChange,
  onPitchChange,
  onVolumeChange,
  speaking,
  onStopAll,
  selectedVoice,
  rate,
  pitch,
  volume,
}: SpeechControlsProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Group voices by language
  const voicesByLanguage = voices.reduce(
    (acc, voice) => {
      const lang = voice.lang
      if (!acc[lang]) {
        acc[lang] = []
      }
      acc[lang].push(voice)
      return acc
    },
    {} as Record<string, SpeechSynthesisVoice[]>,
  )

  return (
    <div className="flex items-center space-x-2">
      {speaking && (
        <Button
          variant="outline"
          size="sm"
          onClick={onStopAll}
          className="flex items-center bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700"
          aria-label="Stop reading"
        >
          <VolumeX className="h-4 w-4 mr-2" />
          Stop Reading
        </Button>
      )}

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Speech Settings</span>
            <span className="sm:hidden">Settings</span>
            {speaking && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Active
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80">
          <DropdownMenuLabel className="flex items-center">
            <Volume2 className="h-4 w-4 mr-2" />
            Text-to-Speech Settings
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="p-3">
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Voice</label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedVoice}
                onChange={(e) => onVoiceChange(e.target.value)}
              >
                <option value="">Default Voice</option>
                {Object.entries(voicesByLanguage).map(([lang, langVoices]) => (
                  <optgroup key={lang} label={lang}>
                    {langVoices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">Rate</label>
                <span className="text-sm text-gray-500">{rate.toFixed(1)}x</span>
              </div>
              <Slider value={[rate]} min={0.5} max={2} step={0.1} onValueChange={(value) => onRateChange(value[0])} />
            </div>

            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">Pitch</label>
                <span className="text-sm text-gray-500">{pitch.toFixed(1)}</span>
              </div>
              <Slider value={[pitch]} min={0.5} max={2} step={0.1} onValueChange={(value) => onPitchChange(value[0])} />
            </div>

            <div className="mb-2">
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">Volume</label>
                <span className="text-sm text-gray-500">{Math.round(volume * 100)}%</span>
              </div>
              <Slider value={[volume]} min={0} max={1} step={0.1} onValueChange={(value) => onVolumeChange(value[0])} />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
