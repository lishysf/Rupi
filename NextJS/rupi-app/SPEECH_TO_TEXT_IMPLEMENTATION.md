# Speech-to-Text Implementation for Telegram Bot

This document describes the implementation of speech-to-text functionality for the Fundy Telegram bot, allowing users to record voice messages that are automatically transcribed and processed as financial transactions.

## Overview

The implementation adds the ability to:
- Receive voice/audio messages from Telegram users
- Transcribe audio using Groq's Whisper model
- Process transcribed text as financial transactions
- Provide user feedback throughout the process

## Architecture

### Components

1. **Telegram Bot Service** (`src/lib/telegram-bot.ts`)
   - Extended to support audio message types
   - Added file download capabilities
   - Enhanced message interface with voice/audio fields

2. **Groq AI Service** (`src/lib/groq-ai.ts`)
   - Added `transcribeAudio()` method
   - Uses Groq's Whisper Large V3 Turbo model
   - Optimized prompts for financial transaction context

3. **Webhook Handler** (`src/app/api/telegram/webhook/route.ts`)
   - Added `handleAudioMessage()` function
   - Integrated with existing transaction processing flow
   - Enhanced error handling and user feedback

## Implementation Details

### Audio Message Processing Flow

1. **Message Detection**: Webhook detects voice/audio messages
2. **File Download**: Downloads audio file from Telegram servers
3. **Transcription**: Converts audio to text using Groq Whisper
4. **Validation**: Checks transcription quality and length
5. **Processing**: Treats transcribed text as regular message
6. **Transaction**: Processes through existing AI transaction parser

### Key Features

- **Multi-format Support**: Handles OGG, MP3, WAV, M4A formats
- **Duration Validation**: Warns users about long audio messages
- **Quality Checks**: Validates transcription length and content
- **Error Handling**: Comprehensive error messages and fallbacks
- **User Feedback**: Real-time status updates during processing

### Configuration

The implementation uses the following Groq configuration:
- **Model**: `whisper-large-v3-turbo`
- **Language**: Indonesian (`id`) - optimized for Indonesian voice messages
- **Temperature**: 0.0 (deterministic output)
- **Response Format**: `verbose_json` with word/segment timestamps
- **Context Prompt**: Optimized for Indonesian financial transaction descriptions

## Usage Examples

### Voice Message Examples

Users can send voice messages in Indonesian like:
- "Beli makan siang 50 ribu rupiah hari ini"
- "Terima gaji 2 juta dari kantor"
- "Transfer 100 ribu dari Gojek ke BCA"
- "Simpan 500 ribu untuk liburan"
- "Bayar listrik 200 ribu pakai BCA"
- "Dapat uang 1 juta dari freelance"

### Expected Flow

1. User sends voice message (max 30 seconds)
2. Bot responds: "🎤 Audio Transcribed: [text] Processing as transaction..."
3. Bot processes transaction and shows confirmation with transaction details
4. User can confirm, edit, or cancel the transaction using inline buttons
5. Transaction is recorded only after user confirmation

### Confirmation Flow

Voice messages now follow the same confirmation flow as text messages:

- **✅ Confirm**: Records the transaction immediately
- **✏️ Edit**: Allows user to modify transaction details
- **❌ Cancel**: Discards the transaction without recording

This ensures consistency between voice and text input methods while giving users full control over their transactions.

## Error Handling

The implementation includes comprehensive error handling for:
- Missing file IDs
- Download failures
- Transcription errors
- Invalid audio formats
- Network timeouts
- API rate limits

## Testing

### Test Script

A test script is provided (`test-speech-to-text.js`) that can be used to verify the transcription service:

```bash
# Add a test audio file named 'test-audio.ogg'
node test-speech-to-text.js
```

### Manual Testing

1. Send a voice message to the Telegram bot
2. Verify transcription accuracy
3. Check transaction processing
4. Test error scenarios (long audio, poor quality, etc.)

## Performance Considerations

- **File Size**: Audio files are downloaded in memory (consider streaming for large files)
- **Processing Time**: Transcription adds 2-5 seconds to response time
- **Rate Limits**: Groq API has rate limits for transcription requests
- **Storage**: Audio files are not persisted (processed in memory only)

## Security Considerations

- Audio files are processed in memory and not stored
- File downloads are validated through Telegram's API
- Transcription results are logged for debugging
- No sensitive audio data is persisted

## Future Enhancements

Potential improvements:
1. **Language Detection**: Auto-detect language for better transcription
2. **Audio Quality**: Pre-processing to improve transcription accuracy
3. **Batch Processing**: Handle multiple audio messages
4. **Offline Support**: Local transcription for better privacy
5. **Voice Commands**: Special voice commands for common actions

## Dependencies

- `groq-sdk`: For audio transcription
- `fs`: For file operations (test script)
- Telegram Bot API: For file downloads

## Environment Variables

Ensure the following environment variables are set:
- `GROQ_API_KEY`: Your Groq API key
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token

## Troubleshooting

### Common Issues

1. **Transcription Fails**
   - Check Groq API key and quota
   - Verify audio file format
   - Check network connectivity

2. **Poor Transcription Quality**
   - Ensure clear audio with minimal background noise
   - Keep messages under 60 seconds
   - Speak clearly and at normal pace

3. **File Download Issues**
   - Verify Telegram bot token
   - Check file size limits
   - Ensure webhook is properly configured

### Debug Logging

The implementation includes comprehensive logging:
- Audio file download status
- Transcription progress
- Error details and stack traces
- Processing time metrics

## Conclusion

The speech-to-text implementation provides a seamless way for users to record financial transactions using voice messages. The integration with the existing transaction processing system ensures consistency and reliability while providing an intuitive user experience.
