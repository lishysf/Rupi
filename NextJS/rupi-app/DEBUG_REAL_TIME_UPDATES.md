# Debug Guide: Real-Time Updates Not Working

This guide will help you debug why the real-time updates aren't working after Telegram transactions.

## 🔍 **Step-by-Step Debugging**

### 1. **Check Browser Console**

Open your web dashboard and check the browser console for SSE connection logs:

**Expected logs:**
```
🔌 Setting up SSE connection for user: [user-id]
🔌 Session user object: {id: "...", name: "...", ...}
🔌 Connecting to SSE endpoint: /api/events?userId=[user-id]
🔌 Connected to real-time updates
📡 Real-time connection established: Connected to real-time updates
```

**If you see errors:**
- `SSE connection error` → Check network connectivity
- `No session user ID` → User not logged in properly
- `SSE readyState: 2` → Connection closed/failed

### 2. **Check Server Logs**

When you open the dashboard, you should see in your server logs:

```
🔌 SSE connection request for user: [user-id]
🔌 User [user-id] connected to real-time updates
```

### 3. **Test SSE Connection**

Use the debug component (only visible in development):

1. Open your dashboard in development mode
2. Look for the "SSE Debug" panel in the bottom-right corner
3. Click "Test SSE Broadcast"
4. Check if you see the test message in console

**Expected result:**
```
📡 Received transaction update: {type: "test", message: "Test from debug component", ...}
```

### 4. **Test Telegram Transaction**

1. Create a transaction via Telegram
2. Check server logs for broadcast attempts:

**Expected logs:**
```
📡 User session for telegram user [telegram-id]: {fundy_user_id: [number], ...}
📡 Broadcasting to fundy user ID: [number]
📡 Attempting to broadcast transaction update to user [number]
📡 Active connections: ["[number]"]
📡 Successfully broadcasted transaction update to user [number]
```

### 5. **Check User ID Mismatch**

The most common issue is user ID mismatch:

**Telegram webhook uses:** `userSession.fundy_user_id` (database ID)
**SSE connection uses:** `session.user.id` (NextAuth session ID)

**To check:**
1. Look at the SSE connection logs for the user ID format
2. Look at the broadcast logs for the user ID format
3. They should match exactly

## 🛠️ **Common Issues & Solutions**

### Issue 1: No SSE Connection
**Symptoms:** No connection logs in browser console
**Solution:** 
- Check if user is logged in
- Verify session is valid
- Check network connectivity

### Issue 2: SSE Connects but No Broadcasts
**Symptoms:** Connection established but no updates received
**Solution:**
- Check user ID format mismatch
- Verify Telegram webhook is calling broadcast functions
- Check server logs for broadcast attempts

### Issue 3: User ID Mismatch
**Symptoms:** "No active connection found for user [id]"
**Solution:**
- Check if `session.user.id` matches `userSession.fundy_user_id`
- May need to use a different user identifier

### Issue 4: Connection Drops
**Symptoms:** SSE connection errors and reconnection attempts
**Solution:**
- Check server stability
- Verify no network issues
- Check for memory leaks

## 🧪 **Manual Testing**

### Test 1: Direct SSE Test
```bash
curl -N "http://localhost:3000/api/events?userId=YOUR_USER_ID"
```

### Test 2: Manual Broadcast Test
```bash
curl -X POST "http://localhost:3000/api/test-sse" \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID", "testData": {"message": "test"}}'
```

### Test 3: Check Active Connections
Look for this log in server:
```
📡 Active connections: ["user1", "user2", ...]
```

## 📊 **Debug Information to Collect**

When reporting issues, please provide:

1. **Browser Console Logs** (SSE connection)
2. **Server Logs** (connection establishment)
3. **Server Logs** (broadcast attempts)
4. **User ID Formats** (both SSE and broadcast)
5. **Network Tab** (SSE connection status)
6. **Test Results** (from debug component)

## 🔧 **Quick Fixes**

### Fix 1: Restart SSE Connection
```javascript
// In browser console
window.location.reload();
```

### Fix 2: Clear Connection Cache
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
```

### Fix 3: Check User Session
```javascript
// In browser console
console.log('Session:', await fetch('/api/auth/session').then(r => r.json()));
```

## 📝 **Expected Flow**

1. **Dashboard Loads** → SSE connection established
2. **Telegram Transaction** → Webhook processes transaction
3. **Transaction Confirmed** → Webhook broadcasts update
4. **SSE Receives Update** → Dashboard refreshes data
5. **User Sees Update** → New transaction appears

If any step fails, check the logs for that specific step.

## 🚨 **Emergency Fallback**

If SSE is completely broken, the dashboard will still work with:
- Manual refresh (F5)
- Background polling (every 5 minutes)
- Web chat transactions (still work normally)

The real-time updates are an enhancement, not a requirement for basic functionality.
