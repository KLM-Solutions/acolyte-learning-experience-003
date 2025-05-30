'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onTranscription, disabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      // @ts-ignore - Speech Recognition API types
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex;
          const result = event.results[current];
          const transcriptText = result[0].transcript;
          
          setTranscript(transcriptText);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          // Don't treat "aborted" as a critical error, as it's often just the API resetting
          if (event.error !== 'aborted') {
            console.error("Speech recognition error", event.error);
          }
          
          // Don't stop recording on aborted errors, as this is usually temporary
          if (event.error !== 'aborted' && isRecording) {
            stopRecording();
          }
        };
        
        recognitionRef.current.onend = () => {
          if (isRecording) {
            // Add a small delay before restarting to prevent rapid restart cycles
            setTimeout(() => {
              if (isRecording && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.warn("Could not restart speech recognition", e);
                }
              }
            }, 100);
          }
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    if (disabled) return;
    
    setIsRecording(true);
    setTranscript("");
    
    try {
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      // Also start audio recording for backup/verification
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();
    } catch (err) {
      console.error("Error starting recording:", err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsProcessing(true);
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Stop media recorder if it was started
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      
      // Release microphone
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    
    setIsRecording(false);
    
    // Small delay to ensure final transcript is captured
    setTimeout(() => {
      if (transcript) {
        onTranscription(transcript);
      }
      setIsProcessing(false);
      setTranscript("");
    }, 300);
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className={`
          ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} 
          w-24 h-24 rounded-full flex items-center justify-center transition-colors
          ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isRecording ? "Stop recording" : "Start recording"}
      >
        {isProcessing ? (
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        ) : (
          <Mic className="h-10 w-10 text-white" />
        )}
      </button>
      
      <p className="mt-4 text-gray-500 text-center">
        {isRecording 
          ? "Listening... Click to stop" 
          : "Tap the microphone and start speaking..."}
      </p>
      
      {transcript && isRecording && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg max-w-md">
          <p className="text-sm font-medium">{transcript}</p>
        </div>
      )}
    </div>
  );
} 