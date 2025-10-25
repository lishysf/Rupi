import { NextRequest, NextResponse } from 'next/server';
import { TelegramDatabase } from '@/lib/telegram-database';
import { TelegramBotService, TelegramUpdate } from '@/lib/telegram-bot';
import { UserDatabase } from '@/lib/database';
import { GroqAIService } from '@/lib/groq-ai';
import { TransactionDatabase, UserWalletDatabase, BudgetDatabase, SavingsGoalDatabase, Transaction } from '@/lib/database';
import bcrypt from 'bcryptjs';

// Store user states for authentication flow
const userStates = new Map<string, { state: 'awaiting_email' | 'awaiting_password'; email?: string }>();

// Helper function to find wallet by name (same as in chat route)
function findWalletByName(wallets: Array<{id: number, name: string}>, walletName: string | undefined, walletType: string | undefined): number | undefined {
  if (!walletName || !walletType) return undefined;
  
  const walletNameLower = walletName.toLowerCase();
  
  let matchingWallet = wallets.find(w => w.name.toLowerCase() === walletNameLower);
  if (!matchingWallet) {
    matchingWallet = wallets.find(w => w.name.toLowerCase().includes(walletNameLower));
  }
  if (!matchingWallet) {
    matchingWallet = wallets.find(w => walletNameLower.includes(w.name.toLowerCase()));
  }
  
  return matchingWallet?.id;
}

// Helper function to handle expense creation
async function handleExpenseCreation(userId: number, description: string, amount: number, category: string, walletId?: number) {
  if (!walletId) {
    throw new Error('Please specify which wallet to use for this expense. For example: "Beli kopi 50rb pakai BCA"');
  }

  const wallets = await UserWalletDatabase.getAllWallets(userId);
  const wallet = wallets.find(w => w.id === walletId);
  
  if (!wallet) {
    throw new Error('Specified wallet not found');
  }

  const currentBalance = await TransactionDatabase.calculateWalletBalance(userId, walletId);
  
  if (currentBalance < amount) {
    throw new Error(`Insufficient balance in ${wallet.name}. Current: Rp${currentBalance.toLocaleString()}, Required: Rp${amount.toLocaleString()}`);
  }
  
  return await TransactionDatabase.createTransaction(
    userId, 
    description, 
    amount, 
    'expense',
    walletId,
    category,
    undefined,
    undefined,
    undefined,
    undefined,
    new Date()
  );
}

// Helper function to handle income creation
async function handleIncomeCreation(userId: number, description: string, amount: number, source: string, walletId?: number) {
  if (!walletId) {
    throw new Error('Please specify which wallet to receive this income. For example: "Gaji 5 juta ke BCA"');
  }

  const wallets = await UserWalletDatabase.getAllWallets(userId);
  const wallet = wallets.find(w => w.id === walletId);
  
  if (!wallet) {
    throw new Error('Specified wallet not found');
  }
  
  return await TransactionDatabase.createTransaction(
    userId, 
    description, 
    amount, 
    'income',
    walletId,
    undefined,
    source,
    undefined,
    undefined,
    undefined,
    new Date()
  );
}

// Helper function to handle transfer creation
async function handleTransferCreation(
  userId: number, 
  description: string, 
  amount: number, 
  fromWalletId: number, 
  toWalletId: number, 
  adminFee?: number
) {
  const wallets = await UserWalletDatabase.getAllWallets(userId);
  const fromWallet = wallets.find(w => w.id === fromWalletId);
  const toWallet = wallets.find(w => w.id === toWalletId);
  
  if (!fromWallet) {
    throw new Error('Source wallet not found');
  }
  
  if (!toWallet) {
    throw new Error('Destination wallet not found');
  }

  const totalAmount = amount + (adminFee || 0);
  const currentBalance = await TransactionDatabase.calculateWalletBalance(userId, fromWalletId);
  
  if (currentBalance < totalAmount) {
    throw new Error(`Insufficient balance in ${fromWallet.name}. Current: Rp${currentBalance.toLocaleString()}, Required: Rp${totalAmount.toLocaleString()}`);
  }

  // Create transfer transaction (outgoing)
  await TransactionDatabase.createTransaction(
    userId, 
    `${description} (Transfer to ${toWallet.name})`, 
    amount, 
    'transfer',
    fromWalletId,
    'Transfer',
    undefined,
    undefined,
    toWalletId.toString(),
    undefined,
    new Date()
  );

  // Create income transaction (incoming)
  await TransactionDatabase.createTransaction(
    userId, 
    `${description} (Transfer from ${fromWallet.name})`, 
    amount, 
    'income',
    toWalletId,
    undefined,
    'Transfer',
    undefined,
    fromWalletId.toString(),
    undefined,
    new Date()
  );

  // Create admin fee transaction if applicable
  if (adminFee && adminFee > 0) {
    await TransactionDatabase.createTransaction(
      userId, 
      `${description} (Admin Fee)`, 
      adminFee, 
      'expense',
      fromWalletId,
      'Fees',
      undefined,
      undefined,
      undefined,
      undefined,
      new Date()
    );
  }

  return { fromWallet, toWallet, amount, adminFee };
}

// Handle incoming Telegram messages
async function handleMessage(update: TelegramUpdate) {
  console.log('🚀 Starting message processing...');
  
  const message = update.message;
  
  if (!message || !message.text) {
    console.log('❌ No message or text found, skipping');
    return;
  }

  const telegramUserId = message.from.id.toString();
  const chatId = message.chat.id.toString();
  const text = message.text.trim();
  const username = message.from.username;
  const firstName = message.from.first_name;
  const lastName = message.from.last_name;

  console.log(`📱 Telegram message from ${firstName} (${telegramUserId}): ${text}`);
  console.log(`🔍 Processing message: "${text}" for user ${telegramUserId}`);

  // Check authentication flow FIRST (before any database operations)
  // Use database instead of in-memory state for serverless persistence
  let userState = null;
  try {
    userState = await TelegramDatabase.getAuthState(telegramUserId);
    console.log(`🔍 Database auth state for user ${telegramUserId}:`, userState);
  } catch (error) {
    console.error('❌ Error getting auth state from database:', error);
  }
  
  if (userState) {
    console.log(`🔍 User is in authentication flow: ${userState.state}`);
    
    if (userState.state === 'awaiting_email') {
      console.log(`📧 Processing email for user ${telegramUserId}: ${text}`);
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(text)) {
        console.log(`❌ Invalid email format for user ${telegramUserId}: ${text}`);
        await TelegramBotService.sendMessage(chatId, '❌ Invalid email format. Please enter a valid email:');
        return;
      }

      console.log(`✅ Valid email received for user ${telegramUserId}, transitioning to password state`);
      await TelegramDatabase.setAuthState(telegramUserId, 'awaiting_password', text);
      
      const passwordPromptResult = await TelegramBotService.sendMessage(chatId, '🔒 Please enter your password:');
      console.log(`🔒 Password prompt sent to user ${telegramUserId}: ${passwordPromptResult ? 'SUCCESS' : 'FAILED'}`);
      return;
    }

    if (userState.state === 'awaiting_password' && userState.email) {
      const email = userState.email;
      const password = text;

      try {
        // Authenticate user
        const user = await UserDatabase.getUserByEmail(email);
        
        if (!user) {
          await TelegramBotService.sendMessage(chatId, '❌ Invalid email or password. Please try /login again.');
          await TelegramDatabase.clearAuthState(telegramUserId);
          return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isPasswordValid) {
          await TelegramBotService.sendMessage(chatId, '❌ Invalid email or password. Please try /login again.');
          await TelegramDatabase.clearAuthState(telegramUserId);
          return;
        }

        // Authenticate session
        await TelegramDatabase.authenticateUser(telegramUserId, user.id);
        await TelegramDatabase.clearAuthState(telegramUserId);

        await TelegramBotService.sendMessage(
          chatId, 
          `✅ *Login successful!*\n\nWelcome back, ${user.name}!\n\nYou can now chat with me to manage your finances. Try:\n• "Beli kopi 30k pakai Gopay"\n• "Analisis pengeluaran bulan ini"`
        );
      } catch (error) {
        console.error('Authentication error:', error);
        await TelegramBotService.sendMessage(chatId, '❌ Authentication failed. Please try /login again.');
        await TelegramDatabase.clearAuthState(telegramUserId);
      }
      return;
    }
  }

  // Create fallback session immediately (no database dependency)
  let session: any = {
    is_authenticated: false,
    fundy_user_id: null,
    telegram_user_id: telegramUserId,
    chat_id: chatId,
    username,
    first_name: firstName,
    last_name: lastName,
    created_at: new Date(),
    last_activity: new Date()
  };

  // Don't send immediate response - let the normal flow handle everything
  let immediateResponseSent = false;
  
  // Try database operations in background (non-blocking)
  try {
    console.log('🔥 Warming up database connection...');
    await TelegramDatabase.warmUpConnection();
    console.log('✅ Database connection warmed up successfully');
    
    console.log('📦 Initializing database tables...');
    await TelegramDatabase.initializeTables();
    console.log('✅ Database tables initialized successfully');
    
    console.log('👤 Getting or creating session for user:', telegramUserId);
    const dbSession = await TelegramDatabase.getOrCreateSession(
      telegramUserId,
      chatId,
      username,
      firstName,
      lastName
    );
    session = dbSession;
    console.log('✅ Session retrieved from database:', { 
      is_authenticated: session.is_authenticated, 
      fundy_user_id: session.fundy_user_id 
    });
  } catch (error) {
    console.error('❌ Database operations failed, using fallback session:', error);
    console.log('🔄 Using fallback session for user:', telegramUserId);
  }
  
  // No early return - process all messages through normal flow

  // Handle /start command
  if (text === '/start') {
    console.log('🚀 Handling /start command');
    const welcomeMessage = `👋 Welcome to *Fundy AI Assistant*!\n\nI can help you manage your finances through Telegram.\n\n🔐 *To get started, you need to login with your Fundy account.*\n\nUse /login to authenticate with your email and password.\n\nOnce logged in, you can:\n• Record expenses and income\n• Analyze your spending\n• Track your budgets\n• And much more!\n\nTry /help to see all available commands.`;
    
    try {
      const result = await TelegramBotService.sendMessage(chatId, welcomeMessage);
      console.log('📤 /start message sent:', result ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.error('❌ Failed to send /start message:', error);
      // Try a simpler fallback message
      try {
        await TelegramBotService.sendMessage(chatId, 'Welcome! Use /login to start.');
      } catch (fallbackError) {
        console.error('❌ Fallback /start message also failed:', fallbackError);
      }
    }
    return;
  }

  // Handle /help command
  if (text === '/help') {
    const helpMessage = `📚 *Fundy Bot Commands*\n\n/start - Start the bot\n/login - Login with your Fundy account\n/logout - Logout from your account\n/status - Check your login status\n/help - Show this help message\n\n💬 *Once logged in, just chat with me naturally!*\n\nExamples:\n• "Beli kopi 30k pakai Gopay"\n• "Gaji 5 juta ke BCA"\n• "Analisis pengeluaran bulan ini"\n• "Berapa total pengeluaran?"`;
    
    await TelegramBotService.sendMessage(chatId, helpMessage);
    return;
  }

  // Handle /status command
  if (text === '/status') {
    if (session.is_authenticated && session.fundy_user_id) {
      try {
        const user = await UserDatabase.getUserById(session.fundy_user_id);
        const statusMessage = `✅ *You are logged in*\n\nEmail: ${user?.email}\nName: ${user?.name}\n\nYou can now chat with me to manage your finances!`;
        await TelegramBotService.sendMessage(chatId, statusMessage);
      } catch (error) {
        await TelegramBotService.sendMessage(chatId, '❌ Error fetching user info. Please try /login again.');
      }
    } else {
      await TelegramBotService.sendMessage(chatId, '❌ You are not logged in. Use /login to authenticate.');
    }
    return;
  }

  // Handle /login command
  if (text === '/login') {
    console.log('🔐 Handling /login command');
    if (session.is_authenticated) {
      console.log('⚠️ User already authenticated');
      await TelegramBotService.sendMessage(chatId, '✅ You are already logged in! Use /logout to logout first.');
      return;
    }

    console.log('📧 Starting login flow - requesting email');
    await TelegramDatabase.setAuthState(telegramUserId, 'awaiting_email');
    const result = await TelegramBotService.sendMessage(chatId, '📧 Please enter your Fundy account email:');
    console.log('📤 Login email prompt sent:', result ? 'SUCCESS' : 'FAILED');
    return;
  }

  // Handle /logout command
  if (text === '/logout') {
    await TelegramDatabase.logoutUser(telegramUserId);
    userStates.delete(telegramUserId);
    await TelegramBotService.sendMessage(chatId, '👋 You have been logged out successfully.');
    return;
  }

  // Authentication flow is now handled at the beginning of the function

  // Check if user is authenticated for regular chat
  if (!session.is_authenticated || !session.fundy_user_id) {
    console.log('🔐 User not authenticated, sending login prompt');
    
    // ALWAYS send a response - multiple fallback attempts
    let responseSent = false;
    
    try {
      const result = await TelegramBotService.sendMessage(
        chatId, 
        '🔐 Please login first using /login to chat with me.'
      );
      console.log('📤 Login prompt sent:', result ? 'SUCCESS' : 'FAILED');
      responseSent = result;
    } catch (error) {
      console.error('❌ Failed to send login prompt:', error);
      
      // Try a simpler message as fallback
      try {
        const fallbackResult = await TelegramBotService.sendMessage(chatId, 'Please use /login to start.');
        console.log('📤 Fallback message sent:', fallbackResult ? 'SUCCESS' : 'FAILED');
        responseSent = fallbackResult;
      } catch (fallbackError) {
        console.error('❌ Fallback message also failed:', fallbackError);
        
        // Last resort - try the simplest possible message
        try {
          const lastResortResult = await TelegramBotService.sendMessage(chatId, 'Hi! Use /login');
          console.log('📤 Last resort message sent:', lastResortResult ? 'SUCCESS' : 'FAILED');
          responseSent = lastResortResult;
        } catch (lastResortError) {
          console.error('❌ All message attempts failed:', lastResortError);
        }
      }
    }
    
    if (!responseSent) {
      console.error('❌ CRITICAL: Could not send any response to user');
    }
    
    return;
  }

  // Handle regular chat messages (AI chat)
  await TelegramBotService.sendTypingAction(chatId);

  try {
    const userId = session.fundy_user_id;

    // Get user wallets
    const userWallets = await UserWalletDatabase.getAllWallets(userId);

    // Use the same AI decision logic as web chat
    const decision = await GroqAIService.decideAndParse(text, userId);
    const intent = decision.intent;

    let response = '';
    let transactionCreated = false;

    // Handle transaction intent
    if (intent === 'transaction') {
      const parsedTransaction = decision.transactions?.[0] || await GroqAIService.parseTransaction(text, userId);

      if (parsedTransaction.confidence >= 0.5 && parsedTransaction.amount > 0) {
        let walletId: number | undefined;
        
        if (parsedTransaction.walletName && parsedTransaction.walletType) {
          walletId = findWalletByName(userWallets, parsedTransaction.walletName, parsedTransaction.walletType);
        }

        if (parsedTransaction.type === 'expense') {
          try {
            await handleExpenseCreation(
              userId,
              parsedTransaction.description,
              parsedTransaction.amount,
              parsedTransaction.category!,
              walletId
            );
            
            const walletInfo = walletId ? ` using ${parsedTransaction.walletName}` : '';
            response = `✅ Expense recorded: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} in ${parsedTransaction.category} category${walletInfo}.`;
            transactionCreated = true;
          } catch (error) {
            response = error instanceof Error ? error.message : 'Error recording expense';
          }
        } else if (parsedTransaction.type === 'income') {
          await handleIncomeCreation(
            userId,
            parsedTransaction.description,
            parsedTransaction.amount,
            parsedTransaction.source!,
            walletId
          );

          const walletInfo = walletId ? ` to ${parsedTransaction.walletName}` : '';
          response = `✅ Income recorded: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} from ${parsedTransaction.source}${walletInfo}.`;
          transactionCreated = true;
        } else if (parsedTransaction.type === 'transfer') {
          try {
            // Find destination wallet
            const toWalletId = findWalletByName(
              userWallets, 
              (parsedTransaction as any).walletNameDestination, 
              (parsedTransaction as any).walletTypeDestination
            );

            if (!walletId || !toWalletId) {
              throw new Error('Please specify both source and destination wallets. For example: "Transfer 100k dari BCA ke Gopay"');
            }

            const result = await handleTransferCreation(
              userId,
              parsedTransaction.description,
              parsedTransaction.amount,
              walletId,
              toWalletId,
              (parsedTransaction as any).adminFee
            );

            const adminFeeText = (parsedTransaction as any).adminFee ? ` (Admin fee: Rp${(parsedTransaction as any).adminFee.toLocaleString()})` : '';
            response = `✅ Transfer recorded: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} from ${result.fromWallet.name} to ${result.toWallet.name}${adminFeeText}.`;
            transactionCreated = true;
          } catch (error) {
            response = error instanceof Error ? error.message : 'Error recording transfer';
          }
        }
      } else {
        response = 'I need more details to record this transaction. Please specify the amount, description, and wallet.';
      }
    }
    // Handle data analysis intent
    else if (intent === 'data_analysis') {
      const timePeriod = GroqAIService.detectTimePeriod(text);
      
      // Get financial data
      const allTransactions = await TransactionDatabase.getUserTransactions(userId, 100, 0);
      
      const filterTransactions = (transactions: Array<Transaction>, type: string) => {
        return transactions.filter(t => t.type === type);
      };

      const filteredExpenses = filterTransactions(allTransactions, 'expense');
      const filteredIncome = filterTransactions(allTransactions, 'income');
      const filteredSavings = filterTransactions(allTransactions, 'savings');

      const sum = (arr: Array<Transaction>) => arr.reduce((s, t) => s + (typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)), 0);
      const totalExpenses = sum(filteredExpenses);
      const totalIncome = sum(filteredIncome);
      const totalSavings = sum(filteredSavings);

      const walletsWithBalances = await UserWalletDatabase.getAllWalletsWithBalances(userId);
      const totalWalletBalance = (walletsWithBalances as unknown as Array<Record<string, unknown>>).reduce((s, w) => {
        const balance = w.balance as number | string | undefined;
        return s + (typeof balance === 'string' ? parseFloat(balance) : (balance || 0));
      }, 0);

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const budgets = await BudgetDatabase.getAllBudgets(userId, currentMonth, currentYear);
      const savingsGoals = await SavingsGoalDatabase.getAllSavingsGoals(userId);

      const expensesByCategory: Record<string, { total: number, transactions: Array<Transaction> }> = {};
      for (const e of filteredExpenses) {
        const cat = e.category || 'Others';
        if (!expensesByCategory[cat]) expensesByCategory[cat] = { total: 0, transactions: [] };
        expensesByCategory[cat].total += typeof e.amount === 'string' ? parseFloat(e.amount) : (e.amount || 0);
        expensesByCategory[cat].transactions.push(e);
      }

      const financialData = {
        expenses: filteredExpenses,
        income: filteredIncome,
        savings: filteredSavings,
        wallets: walletsWithBalances,
        budgets,
        savingsGoals,
        totals: {
          totalExpenses,
          totalIncome,
          totalSavings,
          totalAssets: totalWalletBalance,
        },
        expensesByCategory
      };

      const currentDate = new Date();
      const currentDateString = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const messageWithDateContext = `${text}\n\nCurrent Date: ${currentDateString}`;
      
      response = await GroqAIService.generateDataAnalysisResponse(messageWithDateContext, financialData, '', timePeriod);
    }
    // Handle general chat
    else {
      const allTransactions = await TransactionDatabase.getUserTransactions(userId, 20, 0);
      const recentExpenses = allTransactions.filter(t => t.type === 'expense').slice(0, 2);
      const recentIncome = allTransactions.filter(t => t.type === 'income').slice(0, 2);
      
      const expenseContext = recentExpenses.length > 0 
        ? `Recent expenses: ${recentExpenses.map(e => `${e.description} (Rp${e.amount.toLocaleString()})`).join(', ')}`
        : 'No recent expenses';
      
      const incomeContext = recentIncome.length > 0
        ? `Recent income: ${recentIncome.map(i => `${i.description} (Rp${i.amount.toLocaleString()})`).join(', ')}`
        : 'No recent income';
        
      const context = `${expenseContext}. ${incomeContext}`;
      
      const currentDate = new Date();
      const currentDateString = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const messageWithDateContext = `${text}\n\nCurrent Date: ${currentDateString}`;
      
      response = await GroqAIService.generateChatResponse(messageWithDateContext, context, '');
    }

    // Format and send response
    const formattedResponse = TelegramBotService.formatAIResponse(response);
    await TelegramBotService.sendMessage(chatId, formattedResponse);

    // Update activity
    await TelegramDatabase.updateActivity(telegramUserId);

  } catch (error) {
    console.error('Error processing message:', error);
    
    // Multiple fallback attempts to ensure response
    let responseSent = false;
    
    try {
      const result = await TelegramBotService.sendMessage(
        chatId, 
        '❌ Sorry, I had trouble processing your message. Please try again.'
      );
      responseSent = result;
    } catch (sendError) {
      console.error('❌ Failed to send error message:', sendError);
      
      try {
        const fallbackResult = await TelegramBotService.sendMessage(chatId, 'Error. Try /login');
        responseSent = fallbackResult;
      } catch (fallbackError) {
        console.error('❌ Fallback error message failed:', fallbackError);
      }
    }
    
    if (!responseSent) {
      console.error('❌ CRITICAL: Could not send any error response to user');
    }
  }
}

// Webhook endpoint - handle POST requests from Telegram
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const update = body as TelegramUpdate;

    console.log('📨 Telegram webhook received:', JSON.stringify(update, null, 2));
    console.log('⏱️ Processing time started at:', new Date().toISOString());

    // Process message IMMEDIATELY (not in background) to ensure response
    try {
      console.log('🚀 Processing message immediately...');
      await handleMessage(update);
      console.log('✅ Message processing completed');
    } catch (error) {
      console.error('❌ Error handling telegram message:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Try to send error message to user if possible
      if (update.message?.chat?.id) {
        try {
          await TelegramBotService.sendMessage(
            update.message.chat.id.toString(), 
            '❌ Sorry, I encountered an error processing your message. Please try again.'
          );
        } catch (sendError) {
          console.error('❌ Failed to send error message to user:', sendError);
        }
      }
    }

    const processingTime = Date.now() - startTime;
    console.log('⚡ Webhook response time:', processingTime + 'ms');

    // Return 200 immediately to Telegram
    return NextResponse.json({ 
      ok: true, 
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Webhook error:', error);
    console.log('❌ Error processing time:', processingTime + 'ms');
    
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for webhook info
export async function GET() {
  try {
    const webhookInfo = await TelegramBotService.getWebhookInfo();
    return NextResponse.json({ 
      success: true, 
      webhookInfo 
    });
  } catch (error) {
    console.error('Error getting webhook info:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get webhook info' 
    }, { status: 500 });
  }
}

// OPTIONS endpoint for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}



