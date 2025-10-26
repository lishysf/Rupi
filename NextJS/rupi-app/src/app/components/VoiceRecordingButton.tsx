'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Square, Loader2 } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

interface VoiceRecordingButtonProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceRecordingButton({ 
  onTranscriptionComplete, 
  disabled = false 
}: VoiceRecordingButtonProps) {
  const {
    isRecording,
    isProcessing,
    error,
    duration,
    startRecording,
    stopRecording,
    processAudio,
    clearError,
    reset
  } = useVoiceRecording();

  const [showError, setShowError] = useState(false);

  // Handle transcription completion
  useEffect(() => {
    if (isProcessing) {
      console.log('🔄 Starting audio processing...');
      processAudio().then((transcribedText) => {
        console.log('📝 Transcription completed:', transcribedText);
        if (transcribedText) {
          console.log('✅ Calling onTranscriptionComplete with:', transcribedText);
          onTranscriptionComplete(transcribedText);
          reset();
        } else {
          console.log('❌ No transcription text received');
        }
      }).catch((error) => {
        console.error('❌ Error in transcription process:', error);
      });
    }
  }, [isProcessing, processAudio, onTranscriptionComplete, reset]);

  // Handle errors
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
       <button
         onClick={handleClick}
         disabled={disabled || isProcessing}
         className={`
           p-2 transition-all duration-200 flex-shrink-0
           ${isRecording 
             ? 'text-red-500 hover:text-red-600' 
             : isProcessing
             ? 'text-orange-500 cursor-not-allowed'
             : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
           }
           ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
         `}
         title={isRecording ? 'Stop recording' : 'Start voice recording'}
       >
         {isProcessing ? (
           <Loader2 className="w-5 h-5 animate-spin" />
         ) : isRecording ? (
           <Square className="w-5 h-5" />
         ) : (
           <Mic className="w-5 h-5" />
         )}
      </button>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
          <div className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing...</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {showError && error && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap max-w-xs">
          <div className="flex items-center gap-1">
            <MicOff className="w-3 h-3" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
