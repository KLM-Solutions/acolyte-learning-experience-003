// app/api/stt/route.ts
import { OpenAI } from 'openai';
import { NextRequest } from 'next/server';
import { ElevenLabsClient } from "elevenlabs";

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a proper audio file for ElevenLabs
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: 'audio/mp3' });
    const file = new File([audioBlob], 'audio.mp3', { type: 'audio/mp3' });

    // Transcribe using ElevenLabs instead of OpenAI Whisper
    const transcription = await elevenLabsClient.speechToText.convert({
      model_id: "scribe_v1",
      file: file,
      "language_code": "en",
    });

    // Remove content inside parentheses
    const responseText = transcription.text.replace(/\([^)]*\)/g, '');

    return new Response(JSON.stringify({ text: responseText }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('STT Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to convert speech to text',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};