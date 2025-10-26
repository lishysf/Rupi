# Transaction Mode Debugging Guide

## Issue Summary
- **Problem 1**: Confirmation buttons not showing in Transaction Mode
- **Problem 2**: Transactions are being created immediately instead of waiting for confirmation

## How to Debug

### Step 1: Open Browser Console
1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to the Console tab

### Step 2: Test Transaction Mode
1. Click the chat icon to open the floating chat
2. Click the mode toggle button to switch to "Transaction Mode"
3. Type a transaction: `Beli kopi 25rb pakai BCA`
4. Press Enter

### Step 3: Check Console Logs
Look for these debug messages in the console:

**Frontend Logs:**
- `🔍 Frontend Debug - Sending request:` - Shows what's being sent to API
  - Check if `isTransactionMode: true`

**Backend Logs (in terminal where npm run dev is running):**
- `🔍 API Debug - isTransactionMode:` - Should be `true`
- `🔍 API Debug - message:` - Your transaction message
- `🤖 AI Analysis: Intent=` - Should be `transaction` or `multiple_transaction`
- `🔍 API Debug - Detected intent:` - Confirms the intent
- `🔍 API Debug - Processing expense, isTransactionMode:` - Should be `true`
- `🔍 API Debug - Creating pending transaction for expense` - Should appear
- `🔍 API Debug - Returning pending transaction:` - Shows the pending transaction data

### Step 4: Check API Response
In browser console, look for:
- `🔍 Debug - API Response:` - Should contain `pendingTransaction` object
- `🔍 Debug - Transaction Mode:` - Should be `true`
- `🔍 Debug - Pending Transaction:` - Should show transaction details

## Expected Behavior

### In Transaction Mode:
1. User types transaction
2. AI parses the transaction
3. API returns `pendingTransaction` (NOT `transactionCreated`)
4. Frontend shows transaction preview with Confirm/Edit buttons
5. User clicks Confirm
6. Transaction is saved to database

### In General Chat Mode:
1. User asks about data: "Show me my spending this month"
2. AI analyzes and responds with insights
3. NO transactions are created

## Common Issues

### Issue 1: Intent Detection Wrong
**Symptom**: Console shows `Intent=general_chat` instead of `Intent=transaction`
**Solution**: The AI is not detecting the transaction properly. Check the message format.

### Issue 2: Transaction Mode Not Passed
**Symptom**: `isTransactionMode: undefined` in API logs
**Solution**: Check if the toggle button is working correctly.

### Issue 3: Pending Transaction Not Returned
**Symptom**: API returns `transactionCreated` instead of `pendingTransaction`
**Solution**: The API is not respecting the transaction mode flag.

### Issue 4: Confirmation Buttons Not Showing
**Symptom**: No buttons appear after AI response
**Solution**: Check if `showConfirmation` is true in the message object.

## Quick Fix Checklist

- [ ] Transaction Mode toggle is visible and clickable
- [ ] Toggle shows "Transaction Mode" when active
- [ ] `isTransactionMode` is passed to API
- [ ] AI detects intent as `transaction` or `multiple_transaction`
- [ ] API returns `pendingTransaction` (not `transactionCreated`)
- [ ] Frontend receives `pendingTransaction` in response
- [ ] `showConfirmation` is set to `true`
- [ ] Confirmation buttons render in the UI

## Test Cases

### Test 1: Transaction Mode - Expense
1. Switch to Transaction Mode
2. Type: `Beli kopi 25rb pakai BCA`
3. Expected: Preview with Confirm/Edit buttons
4. Click Confirm
5. Expected: Transaction saved, success message

### Test 2: Transaction Mode - Income
1. Switch to Transaction Mode
2. Type: `Gaji 8 juta ke BCA`
3. Expected: Preview with Confirm/Edit buttons
4. Click Confirm
5. Expected: Transaction saved, success message

### Test 3: General Chat Mode - Block Transaction
1. Switch to General Chat Mode
2. Type: `Beli kopi 25rb pakai BCA`
3. Expected: Error message saying to switch to Transaction Mode

### Test 4: General Chat Mode - Analytics
1. Switch to General Chat Mode
2. Type: `Show me my spending this month`
3. Expected: Analytics response, NO transaction created

## Next Steps

If the issue persists after checking all the above:
1. Share the console logs (both frontend and backend)
2. Share a screenshot of the UI
3. Specify which test case is failing

