# Web Voice Input Feature

This document describes the voice input functionality added to the web chat interface, allowing users to record voice messages directly from the browser.

## Overview

Users can now record voice messages directly in the web chat interface, which are automatically transcribed and processed as regular text messages. This provides the same voice functionality as Telegram but directly in the web application.

## Components

### 1. Voice Recording Hook (`useVoiceRecording`)
- Manages microphone access and recording state
- Handles audio recording with MediaRecorder API
- Provides transcription processing
- Includes error handling and cleanup

### 2. Voice Recording Button (`VoiceRecordingButton`)
- Visual interface for voice recording
- Shows recording status and duration
- Displays processing indicators
- Handles error states with user feedback

### 3. Transcription API (`/api/transcribe-voice`)
- Processes audio files from web interface
- Uses Groq Whisper for transcription
- Returns transcribed text for chat processing

## How It Works

### Recording Flow
1. **User clicks microphone button** → Requests microphone access
2. **Browser prompts for permission** → User grants access
3. **Recording starts** → Audio is captured in real-time
4. **User clicks stop** → Recording ends and processing begins
5. **Audio is transcribed** → Using Groq Whisper model
6. **Text is sent to chat** → Processed as regular message

### Technical Implementation

**Audio Recording:**
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 44100
  } 
});
```

**Transcription:**
```typescript
const transcribedText = await GroqAIService.transcribeAudio(buffer, filename);
```

**Auto-Send:**
```typescript
const handleVoiceTranscription = (transcribedText: string) => {
  setInputValue(transcribedText);
  setTimeout(() => handleSendMessage(), 100);
};
```

## Features

### Recording Controls
- **Start/Stop**: Click microphone to start, click square to stop
- **Duration Display**: Shows recording time in MM:SS format
- **Visual Feedback**: Button changes color and icon during recording

### Audio Quality
- **Echo Cancellation**: Reduces echo and feedback
- **Noise Suppression**: Filters background noise
- **High Quality**: 44.1kHz sample rate for clear audio

### Error Handling
- **Permission Denied**: Clear error message if microphone access denied
- **Transcription Failed**: Fallback error handling
- **Network Issues**: Graceful error recovery

### User Experience
- **Auto-Send**: Transcribed text is automatically sent
- **Visual Indicators**: Clear status during recording and processing
- **Responsive Design**: Works on desktop and mobile browsers

## Browser Compatibility

### Supported Browsers
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 14.3+)
- **Edge**: Full support

### Requirements
- **HTTPS**: Required for microphone access
- **Modern Browser**: MediaRecorder API support
- **Microphone**: Hardware microphone required

## Usage Examples

### Transaction Recording
```
User clicks mic → "Beli kopi 50 ribu pakai BCA" → Auto-sent → Processed as expense
```

### General Chat
```
User clicks mic → "Berapa total pengeluaran bulan ini?" → Auto-sent → AI responds
```

### Multiple Transactions
```
User clicks mic → "Beli makan 50 ribu dan bayar parkir 10 ribu" → Auto-sent → Multiple transactions detected
```

## Security & Privacy

### Data Handling
- **No Storage**: Audio files are not stored on server
- **Memory Only**: Processed in memory and discarded
- **Secure Transmission**: Audio sent over HTTPS

### Privacy
- **Local Processing**: Recording happens in browser
- **Temporary Upload**: Audio only sent for transcription
- **No Persistence**: No audio data retained

## Performance

### File Size Limits
- **Maximum Size**: 10MB per recording
- **Duration Limit**: 30 seconds maximum
- **Format**: WebM with Opus codec (efficient compression)

### Processing Time
- **Recording**: Real-time (no delay)
- **Transcription**: 2-5 seconds depending on length
- **Total Time**: Typically under 10 seconds end-to-end

## Error Scenarios

### Common Issues
1. **Microphone Access Denied**
   - Error: "Microphone access denied or not available"
   - Solution: User must grant permission in browser

2. **Transcription Failed**
   - Error: "Failed to transcribe audio"
   - Solution: Try speaking more clearly or check network

3. **File Too Large**
   - Error: "Audio file too large (max 10MB)"
   - Solution: Record shorter messages

### Troubleshooting
- **No Microphone**: Check hardware and browser permissions
- **Poor Quality**: Speak clearly and reduce background noise
- **Network Issues**: Check internet connection for transcription

## Future Enhancements

### Planned Features
1. **Voice Commands**: Special voice commands for common actions
2. **Language Detection**: Auto-detect language for better transcription
3. **Offline Support**: Local transcription for better privacy
4. **Voice Cloning**: Personalized voice responses
5. **Multi-Language**: Support for multiple languages

### Technical Improvements
1. **Streaming**: Real-time transcription during recording
2. **Compression**: Better audio compression for faster uploads
3. **Caching**: Cache common phrases for faster processing
4. **Analytics**: Track voice usage patterns

## Integration

### With Existing Features
- **Transaction Mode**: Voice works in both general and transaction modes
- **Real-Time Updates**: Voice transactions trigger dashboard updates
- **Confirmation Flow**: Voice transactions use same confirmation system
- **Error Handling**: Integrated with existing error management

### API Integration
- **Groq Whisper**: Same transcription service as Telegram
- **Chat Processing**: Uses existing chat API endpoints
- **Database**: Same transaction storage and retrieval

## Conclusion

The web voice input feature provides a seamless way for users to interact with the financial assistant using voice commands directly in the browser. It maintains the same functionality as the Telegram voice feature while providing a native web experience with proper error handling and user feedback.
