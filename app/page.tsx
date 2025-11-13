"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import {
  Mic,
  Keyboard,
  Send,
  X,
  Volume2,
  VolumeX,
  ChevronLeft,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Loader,
  Home as HomeIcon, 
  Info,
} from "lucide-react"
import { Avatar } from "@/app/components/ui/avatar"
import { Textarea } from "@/app/components/ui/textarea"
import { motion, AnimatePresence } from "framer-motion"
import { useChat } from "@ai-sdk/react"
import type { LearningMode, Reference } from "./types"
import { SpeechControls } from "@/app/components/speech-controls"
import Image from "next/image"
import { Switch } from "@/app/components/ui/switch" 
import { Label } from "@/app/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert"
import ReactMarkdown from "react-markdown"
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog"
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';


// Define the message structure
interface Message {
  id: string
  content: string
  sender: "user" | "system"
  references?: Reference[]
  role: "user" | "assistant"
}

// Define VoiceRecorderProps interface
interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

// Define the props interface
interface TTSControlsProps {
  messageContent: string;
  messageId: string;
  isEnabled?: boolean;
  audioChunks?: string[];
  isCurrentlyReading?: boolean;
  onStopReading?: () => void;
}

// This function splits a text into chunks based on natural breakpoints
// to improve the flow and quality of text-to-speech output
const chunkResponse = (text: string, chunkSize: number = 200) => {
  // Remove ** and # symbols from the text
  const sanitizedText = text.replace(/[\*\#]/g, '');

  // Split by natural breakpoints (periods followed by space, question marks, exclamation points)
  const sentences = sanitizedText.match(/[^.!?]+[.!?]+\s*/g) || [];
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed the limit, start a new chunk
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  // Add the final chunk if there's anything left
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If we have no chunks (maybe the input had no proper sentences),
  // fall back to word-based chunking
  if (chunks.length === 0) {
    const words = sanitizedText.split(' ');
    currentChunk = '';
    
    for (const word of words) {
      if ((currentChunk + ' ' + word).length <= chunkSize || currentChunk.length === 0) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        chunks.push(currentChunk);
        currentChunk = word;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
  }
  
  return chunks;
};

// TTS Control component
const TTSControls = ({ 
  messageContent, 
  messageId, 
  isEnabled = true, 
  audioChunks = [], 
  isCurrentlyReading = false, 
  onStopReading = () => {} 
}: TTSControlsProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Use provided audioChunks or generate them if not provided
  const [chunks, setChunks] = useState<string[]>([]);
  
  // Initialize chunks ONCE when component mounts or when critical dependencies change
  useEffect(() => {
    if (audioChunks.length > 0) {
      setChunks(audioChunks);
    } else {
      const newChunks = chunkResponse(messageContent);
      setChunks(newChunks);
    }
  }, [messageContent, messageId]); // Only re-run if the message itself changes
  
  const playNextChunk = useCallback(async (chunkIndex: number) => {
    if (chunkIndex >= chunks.length) {
      setIsPlaying(false);
      setCurrentChunkIndex(0);
      return;
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Z5A0ZMhOWwL3m0q2Yo1P/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': 'sk_92abd11707faa16905cdcba5849819cd5b380993a19c10fc',
        },
        body: JSON.stringify({
          text: chunks[chunkIndex],
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setCurrentChunkIndex(chunkIndex + 1);
          playNextChunk(chunkIndex + 1);
        };
        audioRef.current.play();
      }
    } catch (err) {
      console.error('TTS Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to play audio');
      setIsPlaying(false);
    }
  }, [chunks]);
  
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    }
    setIsPlaying(false);
    setCurrentChunkIndex(0);
    onStopReading(); // Call the onStopReading callback
  }, [onStopReading]);
  
  const togglePlayback = useCallback(async () => {
    if (isLoading || !isEnabled) return;

    if (isPlaying) {
      stopPlayback();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsPlaying(true);
      await playNextChunk(0);
    } catch (err) {
      console.error('TTS Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to play audio');
      setIsPlaying(false);
      onStopReading(); // Call the onStopReading callback in case of error
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isEnabled, isPlaying, stopPlayback, playNextChunk, onStopReading]);
  
  // Handle isCurrentlyReading changes
  useEffect(() => {
    let isMounted = true;
    
    // Only start playback if this component is still mounted
    if (isCurrentlyReading && !isPlaying && !isLoading && isMounted) {
      // Use a timeout to break the potential update cycle
      const timer = setTimeout(() => {
        if (isMounted) {
          togglePlayback();
        }
      }, 0);
      
      return () => {
        clearTimeout(timer);
        isMounted = false;
      };
    }
    
    return () => {
      isMounted = false;
    };
  }, [isCurrentlyReading, isPlaying, isLoading, togglePlayback]);
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      if (isPlaying) {
        stopPlayback();
      }
    };
  }, [isPlaying, stopPlayback]);
  
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={togglePlayback}
        disabled={isLoading}
        className={`p-2 rounded-full transition-colors ${
          isPlaying ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-500'
        } hover:bg-opacity-90 disabled:opacity-50`}
        title={isPlaying ? 'Stop' : 'Play'}
      >
        {isLoading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
      
      {error && (
        <span className="text-xs text-red-500">Failed to play audio</span>
      )}
      
      <audio
        ref={audioRef}
        onError={(e) => {
          console.error('Audio error:', e);
          setError('Audio playback failed');
          setIsPlaying(false);
          onStopReading(); // Call the onStopReading callback in case of error
        }}
        onEnded={() => {
          if (currentChunkIndex >= chunks.length - 1) {
            onStopReading(); // Call onStopReading when all chunks have finished playing
          }
        }}
      />
    </div>
  );
};

// Update MessageBubble to pass the right props to TTSControls
const MessageBubble = ({ id, content, role, isCurrentlyReading, onReadMessage, onStopReading }: { id: string, content: string, role: string, isCurrentlyReading: boolean, onReadMessage: () => void, onStopReading: () => void }) => {
  // Create audio chunks for each message
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  
  useEffect(() => {
    // Create audio chunks when the component mounts
    const chunks = chunkResponse(content);
    setAudioChunks(chunks);
  }, [content]);
  
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      {role === 'assistant' && (
        <div className="flex items-start mb-4">
          <div className="mr-2 flex-shrink-0">
            <Image 
              src="/diana.png" 
              alt="Assistant" 
              width={40} 
              height={40} 
              className="rounded-full"
            />
          </div>
          <div className="flex-1 bg-blue-50 rounded-lg p-4">
            <div className="mb-2">
              <TTSControls 
                messageContent={content} 
                messageId={id}
                isEnabled={true}
                audioChunks={audioChunks as never[]}
                isCurrentlyReading={isCurrentlyReading}
                onStopReading={onStopReading}
              />
            </div>
            
            <div className="prose prose-lg max-w-none space-y-4 markdown-custom">
              <ReactMarkdown components={{
                p: ({ node, ...props }) => {
                  // Process content to handle vertical bars
                  const content = typeof props.children === 'string' 
                    ? props.children 
                    : Array.isArray(props.children) 
                      ? props.children.map(child => 
                          typeof child === 'string' 
                            ? child 
                            : child?.props?.children || ''
                        ).join('') 
                      : '';
                  
                  if (content.includes('|')) {
                    // Split by lines first
                    const lines = content.split('\n');
                    
                    // Check if this looks like a markdown table (has multiple lines with vertical bars)
                    const tableLines = lines.filter(line => line.includes('|'));
                    if (tableLines.length > 1) {
                      // Process as a table
                      return (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 border">
                            <tbody>
                              {tableLines.map((line, lineIndex) => {
                                // Skip separator lines (like |---|---|)
                                if (line.replace(/\|/g, '').trim().replace(/[-:]/g, '') === '') {
                                  return null;
                                }
                                
                                // Split the line by vertical bars and remove empty first/last cells
                                const cells = line.split('|').filter(cell => cell !== '');
                                
                                return (
                                  <tr key={lineIndex} className={lineIndex === 0 ? "bg-gray-50" : "border-t"}>
                                    {cells.map((cellContent, cellIndex) => {
                                      // Process markdown formatting within cells (like **bold**)
                                      const processedContent = cellContent.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                      
                                      return (
                                        <td 
                                          key={cellIndex} 
                                          className="px-4 py-2 border-r last:border-r-0"
                                          dangerouslySetInnerHTML={{ __html: processedContent }}
                                        />
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    } else {
                      // Single line with vertical bars - render as regular text
                      return (
                        <div>
                          {lines.map((line, lineIndex) => (
                            <p key={lineIndex}>{line}</p>
                          ))}
                        </div>
                      );
                    }
                  }
                  // Default paragraph rendering for content without vertical bars
                  return <p {...props} />;
                }
              }}>
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
      
      {role === 'user' && (
        <div className="flex items-start justify-end mb-4">
          <div className="bg-green-100 text-gray-800 rounded-lg p-4 mr-2 max-w-[75%]">
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
          <Avatar className="flex-shrink-0">
            <div className="bg-green-500 w-full h-full flex items-center justify-center text-white">You</div>
          </Avatar>
        </div>
      )}
    </div>
  );
};

// Replace the existing VoiceRecorder component with this improved one
const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscription, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lottiePlayerRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/lottie-player@2.0.8/dist/lottie-player.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        throw new Error('Browser does not support voice recording. Please use Chrome, Firefox, or Edge.');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      streamRef.current = stream;

      const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
      let mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
      
      if (!mimeType) {
        throw new Error('No supported audio format found');
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          await processAudio(audioBlob);
        } catch (err) {
          console.error('Error processing audio:', err);
          setError('Failed to process audio');
        } finally {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        }
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setError(null);

      if (lottiePlayerRef.current) {
        lottiePlayerRef.current.play();
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (lottiePlayerRef.current) {
          lottiePlayerRef.current.pause();
          lottiePlayerRef.current.currentTime = 0;
        }
      } catch (err) {
        console.error('Error stopping recording:', err);
        setError('Failed to stop recording');
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process audio');
      }

      const data = await response.json();
      if (data.text) {
        setTranscript(data.text);
        
        // Automatically pass the text to the parent component
        // This will trigger the API call in the parent component
        onTranscription(data.text);
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add timer effect to update recording time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      setIsProcessing(false);
    };
  }, []);

  return (
    <div className="flex items-center space-x-2">
      {isRecording && (
        <div className="flex items-center bg-red-100 px-2 py-1 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
          <span className="text-xs font-medium">{formatTime(recordingTime)}</span>
        </div>
      )}
      <button
        onClick={isRecording ? undefined : startRecording}
        disabled={disabled || isProcessing}
        className={`p-2 rounded-full transition-all duration-200 ${
          isRecording ? 'bg-transparent scale-125' : 'bg-gray-100'
        } hover:bg-opacity-90 disabled:opacity-50 relative`}
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        type="button"
      >
        {isProcessing ? (
          <Loader className="h-6 w-6 animate-spin text-gray-600" />
        ) : isRecording ? (
          <div 
            className="relative w-12 h-12 flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isRecording && !isProcessing) {
                stopRecording();
              }
            }}
          >
            {/* Recording waves animation */}
            <div className="absolute inset-0">
              <div className="recording-wave"></div>
              <div className="recording-wave delay-150"></div>
              <div className="recording-wave delay-300"></div>
            </div>
            <div className="audio-visualizer">
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
            </div>
          </div>
        ) : (
          <Mic className="w-4 h-4 text-gray-600" />
        )}
      </button>
      
      {transcript && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg max-w-md">
          <p className="text-sm font-medium">{transcript}</p>
        </div>
      )}
      
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
};

export default function Home() {
  const [selectedMode, setSelectedMode] = useState<LearningMode>(null)
  const [inputMethod, setInputMethod] = useState<"none" | "mic" | "keyboard">("none")
  const [error, setError] = useState<string | null>(null)
  const [autoRead, setAutoRead] = useState(false)
  const [currentlyReadingId, setCurrentlyReadingId] = useState<string | null>(null)
  const lastMessageRef = useRef<string | null>(null)
  const [initialMessageSent, setInitialMessageSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [hoveredCard, setHoveredCard] = useState<LearningMode | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({
    readymade: true,
    build: true,
    review: true
  });
  const [heroContent, setHeroContent] = useState<{
    heading: string;
    description: string;
    readymade_system_message: string;
    build_system_message: string;
    review_system_message: string;
  } | null>(null);

  // Add refs for each card
  const predesignedCardRef = useRef<HTMLDivElement>(null);
  const brandnewCardRef = useRef<HTMLDivElement>(null);
  const customizedCardRef = useRef<HTMLDivElement>(null);
  const reviewCardRef = useRef<HTMLDivElement>(null);

  // Fetch hero content on component mount
  useEffect(() => {
    const fetchHeroContent = async () => {
      try {
        const response = await fetch('/api/admin');
        const data = await response.json();
        if (data) {
          setHeroContent(data);
        }
      } catch (err) {
        console.error('Error fetching hero content:', err);
      }
    };

    fetchHeroContent();
  }, []);

  // Get the target ref based on which card is hovered
  const getTargetCardRef = (hoveredCard: LearningMode) => {
    switch (hoveredCard) {
      case "readymade": return predesignedCardRef;  // Show on the Build card
      case "build": return reviewCardRef;           // Show on the Review card
      case "review": return predesignedCardRef;     // Show on the Build card (changed)
      default: return null;
    }
  };

  // Function to get video source based on card type
  const getVideoSource = (mode: LearningMode): string => {
    switch (mode) {
      case "readymade":
        return "./Customized.mp4"  // For Ready-made, show Build video
      case "build":
        return "./Review.mp4"   // For Build, show Review video
      case "review":
        return "./Brandnew.mp4"     // For Review, show Ready-made video
      default:
        return "/videos/dummy-video.mp4"
    }
  }
  
  // Function to mute all videos except the specified one
  const muteAllVideosExcept = (activeMode: string | null) => {
    const modes = ["readymade", "build", "review"];
    modes.forEach(mode => {
      const video = document.querySelector(`[data-card-mode="${mode}"] video`) as HTMLVideoElement;
      if (video) {
        if (mode === activeMode) {
          video.muted = false;
          video.play();
          setMutedStates(prev => ({ ...prev, [mode]: false }));
        } else {
          video.muted = true;
          video.pause();
          video.currentTime = 0;
          setMutedStates(prev => ({ ...prev, [mode]: true }));
        }
      }
    });
  }

  // Function to handle mouse enter on card
  const handleCardMouseEnter = (mode: LearningMode) => {
    setHoveredCard(mode);
    // Ensure only the current card's video is unmuted
    muteAllVideosExcept(mode);
  }

  // Function to handle mouse leave on card
  const handleCardMouseLeave = () => {
    // Mute all videos when leaving any card
    muteAllVideosExcept(null);
    setHoveredCard(null);
  }

  // Function to handle video muting on card flip
  const handleCardFlip = (mode: "readymade" | "build" | "review") => {
    // Mute all videos when any card flips
    muteAllVideosExcept(null);
  }

  // Add effect to handle video states when hoveredCard changes
  useEffect(() => {
    muteAllVideosExcept(hoveredCard);
  }, [hoveredCard]);

  // Add effect to handle initial video states
  useEffect(() => {
    // Initially mute all videos
    muteAllVideosExcept(null);
  }, []);

  // Function to get initial message based on selected mode
  const getInitialMessage = (mode: LearningMode): string => {
    switch (mode) {
      case "readymade":
        return "Let's Build fluency by practicing conversations and explaining concepts in your own words. To start, type 'begin' "
      case "build":
        return "Let's Prepare for a real conversation, then reflect to grow from it. To start, type 'begin' "
      case "review":
        return "Let's Revisit ideas, spark questions, and connect insights to your daily work. To start, type 'begin' "
      default:
        return ""
    }
  }

  // Use the AI SDK's useChat hook
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading: chatIsLoading,
    error: chatError,
    reload,
    setMessages
  } = useChat({
    api: "/api/chat",
    body: { 
      mode: selectedMode,
      systemMessage:
        selectedMode === "readymade"
          ? heroContent?.readymade_system_message
          : selectedMode === "build"
            ? heroContent?.build_system_message
            : selectedMode === "review"
              ? heroContent?.review_system_message
              : undefined,
    },
    initialMessages: [],
    onError: (err) => {
      console.error("Chat error:", err)
      setError(`Failed to connect to AI: ${err.message || "Unknown error"}`)
    },
    onFinish: () => {
      // Simplified onFinish handler
    },
  })

  // Effect to send initial message when mode is selected, with a delay
  useEffect(() => {
    if (selectedMode && !initialMessageSent && messages.length === 0) {
      // Set loading state to true
      setIsLoading(true);
      
      // Wait for 3 seconds before showing the initial message
      const timer = setTimeout(() => {
        const initialMessage = getInitialMessage(selectedMode);
        if (initialMessage) {
          // Add the assistant message directly to the chat
          setMessages([
            {
              id: `assistant-initial-${selectedMode}`,
              content: initialMessage,
              role: "assistant"
            }
          ]);
          setInitialMessageSent(true);
        }
        // End loading state
        setIsLoading(false);
      }, 3000); // 3 second delay
      
      return () => clearTimeout(timer);
    }
  }, [selectedMode, initialMessageSent, messages.length, setMessages]);

  // Reset initialMessageSent when going back to selection screen
  useEffect(() => {
    if (selectedMode === null) {
      setInitialMessageSent(false);
      setIsLoading(false);
    }
  }, [selectedMode]);

  // Handle retry - simplified
  const handleRetry = () => {
    setError(null)
    if (messages.length > 0) {
      reload()
    }
  }

  // Handle card selection
  const handleCardSelect = (mode: LearningMode) => {
    console.log("Card selected:", mode)
    setSelectedMode(mode)
    setError(null)
    setShowTooltip(false)
  }

  // Create a custom submit handler that prevents default behavior
  const handleSubmitInput = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // This prevents the page refresh
    
    if (!input || !input.trim()) return;
    
    try {
      await handleSubmit(e, { data: { message: input } });
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    }
    
    // Close the text area by resetting the input method
    setInputMethod("none");
  };

 // Get mode title
const getModeTitle = () => {
  switch (selectedMode) {
    case "readymade":
      return "Rehearse & Explain"
    case "build":
      return "Prepare & Reflect"
    case "review":
      return "Review & Relate"
    default:
      return ""
  }
}

// Get mode icon
const getModeIcon = () => {
  switch (selectedMode) {
    case "readymade":
      return "./Customize.png"
    case "build":
      return "./Get Started.png"
    case "review":
      return "./Spark Session.png"
    default:
      return "./placeholder.svg"
  }
}

  // Function to stop reading any currently playing audio
  const stopReading = () => {
    setCurrentlyReadingId(null);
    // This will be used by the MessageBubble to stop playback
  }

  // Effect to auto-read the last assistant message when streaming completes
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    
    // Check if we have a new message from assistant that's different from what we've seen
    if (
      lastMessage && 
      lastMessage.role === 'assistant' && 
      lastMessage.id !== lastMessageRef.current &&
      !chatIsLoading // Only trigger when streaming is complete
    ) {
      lastMessageRef.current = lastMessage.id;
      
      // If auto-read is enabled, start reading the new message
      if (autoRead) {
        // Small delay to ensure UI is updated
        setTimeout(() => {
          setCurrentlyReadingId(lastMessage.id);
        }, 500);
      }
    }
  }, [messages, chatIsLoading, autoRead]);

  const handleTranscription = (text: string) => {
    if (typeof setInput === "function") {
      setInput(text);
    }
    
    // Focus on the input area
    if (formRef.current) {
      const textarea = formRef.current.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    }
    
    // Optional: Close the microphone modal if you're using one
    setInputMethod("keyboard");
  };

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await processAudio(audioBlob);
        } catch (err) {
          console.error('Error processing audio:', err);
          setError('Failed to process audio');
        } finally {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        }
      };
      
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } catch (err) {
        console.error('Error stopping recording:', err);
        setError('Failed to stop recording');
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.text) {
        handleTranscription(data.text);
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add an effect to focus the textarea when keyboard input method is selected
  useEffect(() => {
    if (inputMethod === "keyboard" && textareaRef.current) {
      // Short timeout to ensure the modal is rendered before focusing
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [inputMethod]);

  // Modify the keyboard button click handler
  const handleKeyboardClick = () => {
    setInputMethod("keyboard");
  };

  // Define your instruction steps
  const instructionSteps = [
    {
      title: "Select a Learning Mode",
      description: "Choose from three options: Ready-Made Scenarios for guided practice, Build Your Own for custom scenarios, or Review & Relate to explore key concepts."
    },
    {
      title: "Voice Input",
      description: "Click the microphone icon in the bottom right corner to speak directly to the assistant. Click again to stop recording."
    },
    {
      title: "Text Input",
      description: "Click the keyboard icon to open the text input panel. Type your message and press Enter or click Send."
    },
    {
      title: "Auto-Read",
      description: "Toggle Auto-Read in the top right corner to have all new responses automatically read aloud."
    },
    {
      title: "Audio Controls",
      description: "Each message has a speaker icon. Click to hear the message read aloud, and click again to stop."
    },
    {
      title: "Navigation",
      description: "Use the 'Back' or 'Home' buttons to return to the main menu. Your conversation will reset when returning."
    },
    {
      title: "Submitting Input",
      description: "After typing or speaking, submit your message to continue the conversation with the AI assistant."
    }
  ];

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-y-auto font-montserrat">
      {/* Solid color banner at the top */}
      <div className="w-full h-[120px] md:h-[120px] h-[60px] flex flex-row items-center justify-center m-0 p-0 mb-6 md:mb-2 lg:mb-0" style={{ backgroundColor: '#3ea6ac' }}>
        <a
          href="https://www.acolyteai.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center group mr-4"
        >
          <ChevronLeft className="h-8 w-8 text-white group-hover:text-gray-200 transition-colors" />
        </a>
        <h1 className="text-4xl font-bold text-white mb-0 drop-shadow-lg">Acolyte Skill Builder</h1>
      </div>
      <AnimatePresence mode="wait">
        {selectedMode === null ? (
          <motion.main
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex min-h-screen flex-col items-center justify-center p-4 pt-0 md:pt-0 md:px-24 bg-gradient-to-b from-gray-50 to-gray-100"
          >
            <div className="w-full max-w-5xl">
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold mb-1 text-center mt-0 md:mt-0 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent font-montserrat-semi-bold"
              >
                {heroContent?.heading || "Leading with Effective Feedback: Empowering Talent and Boosting Retention 👋"}
              </motion.h1>
              
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-gray-600 text-center mb-8 font-montserrat-semi-bold"
              >
                {heroContent?.description || "Practice and refine your skills to improve your accuracy and fluency in providing feedback to your colleagues. Select one below."}
              </motion.p>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1200px] mx-auto">
  {/* Card 1: Review & Relate */}
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.3 }}
    whileHover={{ scale: 1.05 }}
    ref={reviewCardRef}
    onMouseEnter={() => handleCardMouseEnter("review")}
    onMouseLeave={handleCardMouseLeave}
    onAnimationComplete={() => {
      const video = document.querySelector(`[data-card-mode="review"] video`) as HTMLVideoElement;
      if (video) {
        video.muted = true;
        video.pause();
        video.currentTime = 0;
        setMutedStates(prev => ({ ...prev, review: true }));
      }
    }}
  >
    <div
      className="relative flex flex-col items-center justify-center rounded-3xl shadow-xl overflow-hidden px-6 py-10"
      style={{
        minHeight: 520,
        background: 'linear-gradient(180deg, #3EA6AC 0%, #FDF8F3 60%)'
      }}
    >
      {/* LEARN label */}
      <div className="text-4xl font-bold text-white tracking-widest mb-6 z-10" style={{ letterSpacing: '0.1em' }}>
        LEARN
      </div>
      {/* Circular image */}
      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center mb-6 z-10">
        <video
          src="/Learn.mp4"
          className="w-full h-full"
          muted
          loop
          playsInline
          autoPlay
          disablePictureInPicture
          data-card-mode="review"
          onClick={(e) => {
            const video = e.currentTarget;
            video.muted = !video.muted;
            video.currentTime = 0;
            video.play();
          }}
        />
      </div>
      {/* Title */}
      <h2 className="text-2xl font-extrabold text-gray-900 text-center leading-tight mb-2 z-10">
        Review &<br />Relate
      </h2>
      {/* Description */}
      <p className="text-base text-gray-500 text-center mb-8 max-w-[280px] mx-auto z-10">
        Revisit ideas, spark questions, and connect insights to your daily work.
      </p>
      {/* Button */}
      <Button
        className="w-full max-w-[280px] rounded-full py-4 text-lg font-semibold z-10"
        style={{ backgroundColor: '#3EA6AC', color: 'white' }}
        onClick={() => handleCardSelect("review")}
      >
        Start LEARNING
      </Button>
    </div>
  </motion.div>

  {/* Card 2: Ready-Made Scenarios */}
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.4 }}
    whileHover={{ scale: 1.05 }}
    ref={brandnewCardRef}
    onMouseEnter={() => handleCardMouseEnter("readymade")}
    onMouseLeave={handleCardMouseLeave}
    onAnimationComplete={() => {
      const video = document.querySelector(`[data-card-mode="readymade"] video`) as HTMLVideoElement;
      if (video) {
        video.muted = true;
        video.pause();
        video.currentTime = 0;
        setMutedStates(prev => ({ ...prev, readymade: true }));
      }
    }}
  >
    <div
      className="relative flex flex-col items-center justify-center rounded-3xl shadow-xl overflow-hidden px-6 py-10"
      style={{
        minHeight: 520,
        background: 'linear-gradient(180deg, #C6658C 0%, #FDF8F3 60%)'
      }}
    >
      {/* PRACTICE label */}
      <div className="text-4xl font-bold text-white tracking-widest mb-6 z-10" style={{ letterSpacing: '0.1em' }}>
        PRACTICE
      </div>
      {/* Circular image */}
      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center mb-6 z-10">
        <video
          src="/Practice.mp4"
          className="w-full h-full"
          muted
          loop
          playsInline
          autoPlay
          disablePictureInPicture
          data-card-mode="readymade"
          onClick={(e) => {
            const video = e.currentTarget;
            video.muted = !video.muted;
            video.currentTime = 0;
            video.play();
          }}
        />
      </div>
      {/* Title */}
      <h2 className="text-2xl font-extrabold text-gray-900 text-center leading-tight mb-2 z-10">
        Rehearse &<br />Explain
      </h2>
      {/* Description */}
      <p className="text-sm text-gray-500 text-center mb-8 max-w-[280px] mx-auto z-10">
        Build fluency by practicing conversations and explaining concepts in your own words.
      </p>
      {/* Button */}
      <Button
        className="w-full max-w-[280px] rounded-full py-4 text-lg font-semibold z-10"
        style={{ backgroundColor: '#C6658C', color: 'white' }}
        onClick={() => handleCardSelect("readymade")}
      >
        Start PRACTICING
      </Button>
    </div>
  </motion.div>

  {/* Card 3: Build Your Own Scenario */}
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.5 }}
    whileHover={{ scale: 1.05 }}
    ref={predesignedCardRef}
    onMouseEnter={() => handleCardMouseEnter("build")}
    onMouseLeave={handleCardMouseLeave}
    onAnimationComplete={() => {
      const video = document.querySelector(`[data-card-mode="build"] video`) as HTMLVideoElement;
      if (video) {
        video.muted = true;
        video.pause();
        video.currentTime = 0;
        setMutedStates(prev => ({ ...prev, build: true }));
      }
    }}
  >
    <div
      className="relative flex flex-col items-center justify-center rounded-3xl shadow-xl overflow-hidden px-6 py-10"
      style={{
        minHeight: 520,
        background: 'linear-gradient(180deg, #3A4E60 0%, #FDF8F3 60%)'
      }}
    >
      {/* PERFORM label */}
      <div className="text-4xl font-bold text-white tracking-widest mb-6 z-10" style={{ letterSpacing: '0.1em' }}>
        PERFORM
      </div>
      {/* Circular image */}
      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center mb-6 z-10">
        <video
          src="/perform.mp4"
          className="w-full h-full"
          muted
          loop
          playsInline
          autoPlay
          disablePictureInPicture
          data-card-mode="build"
          onClick={(e) => {
            const video = e.currentTarget;
            video.muted = !video.muted;
            video.currentTime = 0;
            video.play();
          }}
        />
      </div>
      {/* Title */}
      <h2 className="text-2xl font-extrabold text-gray-900 text-center leading-tight mb-2 z-10">
        Prepare &<br />Reflect
      </h2>
      {/* Description */}
      <p className="text-base text-gray-500 text-center mb-8 max-w-[280px] mx-auto z-10">
        Prepare for a real conversation, then reflect to grow from it.
      </p>
      {/* Button */}
      <Button
        className="w-full max-w-[280px] rounded-full py-4 text-lg font-semibold z-10"
        style={{ backgroundColor: '#3A4E60', color: 'white' }}
        onClick={() => handleCardSelect("build")}
      >
        Start PERFORMING
      </Button>
    </div>
  </motion.div>
</div>
            </div>
          </motion.main>
        ) : (
          <motion.div
            key="scenario"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col h-screen max-h-screen bg-white overflow-hidden"
          >
            {/* App Header */}
            <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    window.location.reload()
                  }}
                  className="text-gray-700"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <div className="flex items-center space-x-2">
                  <Image
                    src={getModeIcon()}
                    alt={getModeTitle()}
                    width={24}
                    height={24}
                    className="rounded"
                  />
                  {/* Mode label */}
                  {selectedMode === "review" && (
                    <span className="text-xs font-bold uppercase px-2 py-1 rounded-full mr-1" style={{ background: '#3EA6AC', color: 'white', letterSpacing: '0.1em' }}>LEARN</span>
                  )}
                  {selectedMode === "readymade" && (
                    <span className="text-xs font-bold uppercase px-2 py-1 rounded-full mr-1" style={{ background: '#C6658C', color: 'white', letterSpacing: '0.1em' }}>PRACTICE</span>
                  )}
                  {selectedMode === "build" && (
                    <span className="text-xs font-bold uppercase px-2 py-1 rounded-full mr-1" style={{ background: '#3A4E60', color: 'white', letterSpacing: '0.1em' }}>PERFORM</span>
                  )}
                  <h1 className="text-lg font-medium text-gray-900">{getModeTitle()}</h1>
                </div>
              </div>
              {/* Hamburger for mobile */}
              <div className="md:hidden flex items-center relative">
                <button
                  className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => setShowMobileMenu((prev) => !prev)}
                  aria-label="Open menu"
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
                {showMobileMenu && (
                  <div className="absolute top-0 right-full mr-2 z-50 bg-white rounded-lg shadow-lg p-4 w-56 flex flex-col space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-read-mobile"
                        checked={autoRead}
                        onCheckedChange={setAutoRead}
                        onClick={() => {
                          if (autoRead) stopReading();
                        }}
                      />
                      <Label htmlFor="auto-read-mobile" className="text-sm">Auto-Read</Label>
                    </div>
                    <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-gray-700 w-full justify-start"
                        >
                          <Info className="h-4 w-4 mr-1" />
                          Instructions
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>How to Use This Application</DialogTitle>
                          <DialogDescription>
                            Follow these instructions to get the most out of your learning experience.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          <div className="space-y-4">
                            {instructionSteps.map((step, index) => (
                              <div key={index} className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                                <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                                <p className="text-gray-600">{step.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.reload()}
                      className="text-gray-700 w-full justify-start"
                    >
                      <HomeIcon className="h-4 w-4 mr-1" />
                      Home
                    </Button>
                  </div>
                )}
              </div>
              {/* Desktop controls */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-read"
                    checked={autoRead}
                    onCheckedChange={setAutoRead}
                    onClick={() => {
                      if (autoRead) {
                        stopReading();
                      }
                    }}
                  />
                  <Label htmlFor="auto-read" className="text-sm">Auto-Read</Label>
                </div>
                <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-gray-700"
                    >
                      <Info className="h-4 w-4 mr-1" />
                      Instructions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>How to Use This Application</DialogTitle>
                      <DialogDescription>
                        Follow these instructions to get the most out of your learning experience.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      <div className="space-y-4">
                        {instructionSteps.map((step, index) => (
                          <div key={index} className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                            <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                            <p className="text-gray-600">{step.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.location.reload()
                  }}
                  className="text-gray-700"
                >
                  <HomeIcon className="h-4 w-4 mr-1" />
                  Home
                </Button>
              </div>
            </header>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className={`max-w-4xl mx-auto ${inputMethod === "keyboard" ? "pb-40" : ""}`}>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {messages.length === 0 || isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-200px)]">
                    {/* Display the mode icon during loading */}
                    <div className="w-24 h-24 mb-6">
                      <Image
                        src={getModeIcon()}
                        alt={getModeTitle()}
                        width={96}
                        height={96}
                        className="rounded object-contain"
                      />
                    </div>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Starting conversation...</h2>
                    <p className="text-center text-gray-500 max-w-md mb-6">
                      The AI assistant is preparing your {selectedMode} scenario
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      id={message.id}
                      content={message.content}
                      role={message.role as "user" | "assistant"}
                      isCurrentlyReading={message.id === currentlyReadingId}
                      onReadMessage={() => setCurrentlyReadingId(message.id)}
                      onStopReading={stopReading}
                    />
                  ))
                )}
              </div>
            </div>
            
            {/* Input method buttons */}
            <div className="relative">
              {inputMethod === "none" && (
                <div className="fixed bottom-8 right-8 flex flex-col space-y-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="icon"
                      className="rounded-full w-14 h-14 bg-blue-500 hover:bg-blue-600 shadow-lg"
                      onClick={() => setInputMethod("keyboard")}
                    >
                      <Keyboard className="h-6 w-6" />
                    </Button>
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="icon"
                      className={`rounded-full w-14 h-14 ${
                        isRecording 
                          ? 'bg-transparent shadow-none hover:bg-transparent' 
                          : 'bg-green-500 hover:bg-green-600 shadow-lg'
                      } flex items-center justify-center`}
                      onClick={() => isRecording ? stopRecording() : startRecording()}
                    >
                      {isProcessing ? (
                        <Loader className="h-6 w-6 animate-spin" />
                      ) : isRecording ? (
                        <div className="w-20 h-20">
                          <DotLottieReact
                            src="https://lottie.host/64a9a191-3ffa-4874-ae19-53c7a60aaabc/hd7W8ZjBB1.lottie"
                            loop
                            autoplay
                          />
                        </div>
                      ) : (
                        <Mic className="h-6 w-6 text-white" />
                      )}
                    </Button>
                  </motion.div>
                </div>
              )}

              {/* Keyboard input overlay */}
              {inputMethod === "keyboard" && (
                <motion.div
                  className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 z-50"
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.3, type: "spring" }}
                >
                  <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium flex items-center text-gray-700">
                        <MessageSquare className="h-5 w-5 mr-2 text-blue-400" />
                        Type your message
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-gray-100 text-gray-500"
                        onClick={() => setInputMethod("none")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-row space-x-2 sm:space-x-4">
                      <textarea
                        ref={textareaRef}
                        value={input ?? ""}
                        onChange={handleInputChange}
                        onInput={e => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                        rows={1}
                        placeholder="Type your message here..."
                        className="w-full max-w-full p-2 sm:p-3 text-base sm:text-lg border border-gray-200 rounded-md focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 bg-white text-gray-800 placeholder-gray-400 resize-none overflow-x-hidden min-h-[40px] max-h-[240px]"
                      />
                      
                      <form ref={formRef} onSubmit={handleSubmitInput} className="flex items-center">
                        <button
                          type="submit"
                          disabled={isLoading || chatIsLoading || !input || !input.trim()}
                          className={`bg-[#000000] text-white px-3 sm:px-4 py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#333333] transition-colors duration-300 ${(!input || !input.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isLoading ? (
                            <Loader className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <Send size={20} />
                              <span className="hidden sm:inline">Send</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
