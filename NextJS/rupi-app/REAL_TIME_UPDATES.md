# Real-Time Updates for Telegram Transactions

This document explains how the web dashboard automatically updates when transactions are created from Telegram.

## Overview

When users create transactions via Telegram (voice or text), the web dashboard now updates in real-time without requiring a page refresh. This is achieved using Server-Sent Events (SSE).

## Architecture

### Components

1. **SSE Endpoint** (`/api/events`)
   - Handles real-time connections from web clients
   - Broadcasts transaction updates to connected users
   - Manages connection lifecycle and cleanup

2. **Real-Time Hook** (`useRealTimeUpdates`)
   - React hook that manages SSE connection
   - Handles reconnection with exponential backoff
   - Triggers dashboard data refresh on updates

3. **Telegram Webhook Integration**
   - Broadcasts updates when transactions are confirmed
   - Sends both transaction and wallet update events
   - Handles both single and bulk transaction confirmations

## How It Works

### 1. Connection Establishment
```typescript
// User opens web dashboard
const eventSource = new EventSource(`/api/events?userId=${userId}`);
```

### 2. Transaction Creation Flow
```
Telegram User → Voice/Text → Bot Processes → User Confirms → Transaction Created
                                                                    ↓
Web Dashboard ← SSE Broadcast ← Webhook Broadcasts ← Database Updated
```

### 3. Update Broadcasting
When a transaction is confirmed in Telegram:
1. Transaction is saved to database
2. Webhook broadcasts update via SSE
3. Web dashboard receives update
4. Dashboard refreshes data automatically

## Event Types

### Transaction Created
```json
{
  "type": "transaction_created",
  "data": {
    "type": "expense",
    "description": "Beli kopi",
    "amount": 50000,
    "timestamp": 1698321488000
  }
}
```

### Wallet Updated
```json
{
  "type": "wallet_updated",
  "data": {
    "type": "balance_updated",
    "timestamp": 1698321488000
  }
}
```

### Bulk Transactions
```json
{
  "type": "transaction_created",
  "data": {
    "type": "bulk_transactions",
    "count": 3,
    "timestamp": 1698321488000
  }
}
```

## Features

### Automatic Reconnection
- Exponential backoff (1s, 2s, 4s, 8s, 16s)
- Maximum 5 reconnection attempts
- Graceful fallback to polling if SSE fails

### Connection Management
- Automatic cleanup on component unmount
- Handles browser tab close/refresh
- Prevents memory leaks

### Error Handling
- Logs connection errors
- Continues working even if SSE fails
- Fallback to existing refresh mechanisms

## Usage

### For Developers

The real-time updates are automatically enabled when users open the dashboard. No additional setup required.

### For Users

1. Open web dashboard
2. Create transaction via Telegram
3. Dashboard updates automatically
4. No page refresh needed

## Benefits

- **Real-Time**: Instant updates without page refresh
- **Efficient**: Only updates when needed
- **Reliable**: Automatic reconnection and error handling
- **Seamless**: Works across all transaction types
- **Scalable**: Handles multiple concurrent users

## Technical Details

### SSE vs WebSocket
- **SSE**: Unidirectional (server → client)
- **Perfect for**: Transaction notifications
- **Advantages**: Simpler, HTTP-based, automatic reconnection
- **Limitations**: One-way communication only

### Performance
- **Connection Overhead**: Minimal (HTTP keep-alive)
- **Memory Usage**: Low (one connection per user)
- **Bandwidth**: Very low (only sends updates when needed)

### Security
- **User Isolation**: Each user only receives their own updates
- **Authentication**: Uses session-based user identification
- **No Data Exposure**: Only sends update notifications, not sensitive data

## Troubleshooting

### Connection Issues
- Check browser console for SSE errors
- Verify user is logged in
- Check network connectivity

### No Updates
- Ensure Telegram webhook is working
- Check server logs for broadcast errors
- Verify user session is valid

### Performance Issues
- Monitor connection count
- Check for memory leaks
- Verify proper cleanup on disconnect

## Future Enhancements

1. **WebSocket Support**: For bidirectional communication
2. **Push Notifications**: Browser notifications for transactions
3. **Offline Support**: Queue updates when offline
4. **Analytics**: Track real-time update performance
5. **Multi-Device Sync**: Sync across multiple browser tabs
