import { NextRequest, NextResponse } from 'next/server';
import { GroqAIService } from '@/lib/groq-ai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large (max 10MB)' },
        { status: 400 }
      );
    }

    // Check duration (max 30 seconds)
    const audioBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);

    console.log(`🎤 Processing voice input: ${audioFile.size} bytes, type: ${audioFile.type}`);

    // Transcribe using Groq
    const transcribedText = await GroqAIService.transcribeAudio(buffer, audioFile.name);

    if (!transcribedText) {
      return NextResponse.json(
        { error: 'Failed to transcribe audio' },
        { status: 500 }
      );
    }

    console.log(`📝 Voice transcribed: "${transcribedText}"`);

    return NextResponse.json({
      success: true,
      text: transcribedText
    });

  } catch (error) {
    console.error('Error in voice transcription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
