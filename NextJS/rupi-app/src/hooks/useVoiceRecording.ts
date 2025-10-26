import { useState, useRef, useCallback } from 'react';

interface VoiceRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  audioBlob: Blob | null;
  duration: number;
}

export function useVoiceRecording() {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isProcessing: false,
    error: null,
    audioBlob: null,
    duration: 0
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        setState(prev => ({ 
          ...prev, 
          audioBlob,
          isRecording: false 
        }));

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        duration: 0,
        audioBlob: null 
      }));

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({ 
          ...prev, 
          duration: prev.duration + 0.1 
        }));
      }, 100);

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Microphone access denied or not available',
        isRecording: false 
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      // Clear duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [state.isRecording]);

  const processAudio = useCallback(async (): Promise<string | null> => {
    if (!state.audioBlob) return null;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      // Convert blob to buffer
      const arrayBuffer = await state.audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Send to transcription API
      const formData = new FormData();
      const audioFile = new File([state.audioBlob], 'voice-message.webm', {
        type: 'audio/webm;codecs=opus'
      });
      formData.append('audio', audioFile);

      const response = await fetch('/api/transcribe-voice', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const result = await response.json();
      
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        audioBlob: null,
        duration: 0
      }));

      return result.text || null;

    } catch (error) {
      console.error('Error processing audio:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to transcribe audio',
        isProcessing: false 
      }));
      return null;
    }
  }, [state.audioBlob]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isRecording: false,
      isProcessing: false,
      error: null,
      audioBlob: null,
      duration: 0
    });
    
    // Clean up
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    processAudio,
    clearError,
    reset
  };
}
