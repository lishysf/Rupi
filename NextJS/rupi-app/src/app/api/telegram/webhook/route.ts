import { NextRequest, NextResponse } from 'next/server';
import { TelegramDatabase } from '@/lib/telegram-database';
import { TelegramBotService, TelegramUpdate } from '@/lib/telegram-bot';
import { UserDatabase } from '@/lib/database';
import { GroqAIService } from '@/lib/groq-ai';
import { TransactionDatabase, UserWalletDatabase, BudgetDatabase, SavingsGoalDatabase, Transaction, EXPENSE_CATEGORIES, INCOME_SOURCES } from '@/lib/database';
import bcrypt from 'bcryptjs';

// Store user states for authentication flow
const userStates = new Map<string, { state: 'awaiting_email' | 'awaiting_password'; email?: string }>();

// Store pending transactions for confirmation (in-memory for simplicity)
const pendingTransactions = new Map<string, any>();

// Store session mappings for bulk operations (to avoid long callback data)
const sessionMappings = new Map<string, string[]>();

// Parse structured transaction format (no AI needed)
function parseStructuredTransaction(text: string) {
  try {
    // Remove code block markers if present
    const cleanText = text.replace(/```json|```/g, '').trim();
    
    // Check if this is multiple transactions (has # Transaction markers)
    if (cleanText.includes('# Transaction')) {
      // Multiple transactions in key-value format
      const transactionBlocks = cleanText.split('# Transaction').filter(block => block.trim());
      const parsedTransactions = [];

      for (const block of transactionBlocks) {
        const lines = block.split('\n').filter(line => line.trim());
        const transaction: any = { confidence: 1.0 };

        for (const line of lines) {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            const cleanKey = key.trim().toLowerCase();

            switch (cleanKey) {
              case 'type':
                transaction.type = value.toLowerCase();
                break;
              case 'description':
                transaction.description = value;
                break;
              case 'amount':
                transaction.amount = parseFloat(value.replace(/[^\d.]/g, '')) || 0;
                break;
              case 'category':
                transaction.category = value;
                break;
              case 'source':
                transaction.source = value;
                break;
              case 'wallet':
                transaction.walletName = value;
                transaction.walletType = 'bank_card';
                break;
              case 'from_wallet':
                transaction.walletName = value;
                transaction.walletType = 'bank_card';
                break;
              case 'to_wallet':
                transaction.toWalletName = value;
                break;
              case 'admin_fee':
                transaction.adminFee = parseFloat(value.replace(/[^\d.]/g, '')) || 0;
                break;
              case 'goal':
                transaction.goalName = value;
                break;
            }
          }
        }

        // Validate required fields
        if (transaction.type && transaction.description && transaction.amount) {
          parsedTransactions.push(transaction);
        }
      }

      if (parsedTransactions.length > 0) {
        return {
          intent: 'multiple_transaction',
          transactions: parsedTransactions
        };
      }
    }
    
    // Parse as key-value format (single transaction)
    const lines = cleanText.split('\n').filter(line => line.trim());
    const transaction: any = {};
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        const cleanKey = key.trim().toLowerCase();
        
        switch (cleanKey) {
          case 'type':
            transaction.type = value.toLowerCase();
            break;
          case 'description':
            transaction.description = value;
            break;
          case 'amount':
            transaction.amount = parseFloat(value.replace(/[^\d.]/g, '')) || 0;
            break;
          case 'category':
            transaction.category = value;
            break;
          case 'source':
            transaction.source = value;
            break;
          case 'wallet':
            transaction.walletName = value;
            transaction.walletType = 'bank_card'; // Default type
            break;
          case 'from_wallet':
            transaction.walletName = value;
            transaction.walletType = 'bank_card';
            break;
          case 'to_wallet':
            transaction.toWalletName = value;
            break;
          case 'admin_fee':
            transaction.adminFee = parseFloat(value.replace(/[^\d.]/g, '')) || 0;
            break;
          case 'goal':
            transaction.goalName = value;
            break;
        }
      }
    }
    
    // Validate required fields
    if (!transaction.type || !transaction.description || !transaction.amount) {
      return null;
    }
    
    // Set confidence to 1.0 since it's structured data
    transaction.confidence = 1.0;
    
    return {
      intent: 'transaction',
      transactions: [transaction]
    };
  } catch (error) {
    console.error('Error parsing structured transaction:', error);
    return null;
  }
}

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
  sourceWalletId?: number, 
  destinationWalletId?: number, 
  adminFee?: number
) {
  if (!sourceWalletId) {
    throw new Error('Please specify source wallet. For example: "Transfer 100k dari BCA ke Gopay"');
  }
  
  if (!destinationWalletId) {
    throw new Error('Please specify destination wallet. For example: "Transfer 100k dari BCA ke Gopay"');
  }

  const wallets = await UserWalletDatabase.getAllWallets(userId);
  const sourceWallet = wallets.find(w => w.id === sourceWalletId);
  const destinationWallet = wallets.find(w => w.id === destinationWalletId);
  
  if (!sourceWallet) {
    throw new Error('Source wallet not found');
  }
  
  if (!destinationWallet) {
    throw new Error('Destination wallet not found');
  }

  // Check source wallet balance
  const sourceBalance = await TransactionDatabase.calculateWalletBalance(userId, sourceWalletId);
  const totalAmount = amount + (adminFee || 0);
  
  if (sourceBalance < totalAmount) {
    throw new Error(`Insufficient balance in ${sourceWallet.name}. Current: Rp${sourceBalance.toLocaleString()}, Required: Rp${totalAmount.toLocaleString()}`);
  }

  // Create transfer transaction (expense from source)
  await TransactionDatabase.createTransaction(
    userId, 
    description, 
    amount, 
    'transfer',
    sourceWalletId,
    'Transfer',
    undefined,
    destinationWalletId?.toString(),
    undefined,
    undefined,
    new Date()
  );

  // Create income transaction (to destination)
  await TransactionDatabase.createTransaction(
    userId, 
    description, 
    amount, 
    'income',
    destinationWalletId,
    undefined,
    'Transfer',
    undefined,
    undefined,
    undefined,
    new Date()
  );

  // Create admin fee transaction if applicable
  if (adminFee && adminFee > 0) {
    await TransactionDatabase.createTransaction(
      userId, 
      `Admin fee for ${description}`, 
      adminFee, 
      'expense',
      sourceWalletId,
      'Fees',
      undefined,
      undefined,
      undefined,
      undefined,
      new Date()
    );
  }
}

// Helper function to handle savings creation
async function handleSavingsCreation(
  userId: number, 
  description: string, 
  amount: number, 
  walletId?: number, 
  savingsGoal?: string
) {
  if (!walletId) {
    throw new Error('Please specify which wallet to use for savings. For example: "Tabung 500k ke BCA untuk liburan"');
  }

  const wallets = await UserWalletDatabase.getAllWallets(userId);
  const wallet = wallets.find(w => w.id === walletId);
  
  if (!wallet) {
    throw new Error('Specified wallet not found');
  }

  // Check wallet balance
  const currentBalance = await TransactionDatabase.calculateWalletBalance(userId, walletId);
  
  if (currentBalance < amount) {
    throw new Error(`Insufficient balance in ${wallet.name}. Current: Rp${currentBalance.toLocaleString()}, Required: Rp${amount.toLocaleString()}`);
  }

  // Create savings transaction
  await TransactionDatabase.createTransaction(
    userId, 
    description, 
    amount, 
    'savings',
    walletId,
    'Savings',
    undefined,
    undefined,
    undefined,
    savingsGoal,
    new Date()
  );

  // If savings goal is specified, update or create savings goal
  if (savingsGoal) {
    try {
      // Try to get existing savings goal
      const existingGoals = await SavingsGoalDatabase.getAllSavingsGoals(userId);
      const existingGoal = existingGoals.find(goal => 
        goal.goal_name.toLowerCase().includes(savingsGoal.toLowerCase()) ||
        savingsGoal.toLowerCase().includes(goal.goal_name.toLowerCase())
      );

      if (existingGoal) {
        // Update existing goal
        await SavingsGoalDatabase.updateSavingsGoal(
          userId,
          existingGoal.id,
          existingGoal.goal_name,
          existingGoal.target_amount,
          existingGoal.target_date
        );
      } else {
        // Create new savings goal
        await SavingsGoalDatabase.createSavingsGoal(
          userId,
          savingsGoal,
          amount * 10, // Set target as 10x the current amount
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        );
      }
    } catch (error) {
      console.error('Error updating savings goal:', error);
      // Continue with transaction even if goal update fails
    }
  }
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
      await TelegramDatabase.setAuthState(telegramUserId.toString(), 'awaiting_password', text);
      
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
    const helpMessage = `📚 *Fundy Bot Commands*\n\n/start - Start the bot\n/login - Login with your Fundy account\n/logout - Logout from your account\n/status - Check your login status\n/transaction - Switch to Transaction Mode (record only)\n/chat - Switch to General Chat Mode\n/savings - View your savings goals\n/help - Show this help message\n\n💬 *Once logged in, just chat with me naturally!*\n\nExamples:\n• "Beli kopi 30k pakai Gopay"\n• "Gaji 5 juta ke BCA"\n• "Tabung 500k ke BCA untuk liburan"\n• "Analisis pengeluaran bulan ini"\n• "Berapa total pengeluaran?"`;
    
    await TelegramBotService.sendMessage(chatId, helpMessage);
    return;
  }

  // Handle /transaction command (switch to transaction mode)
  if (text === '/transaction') {
    if (session.is_authenticated && session.fundy_user_id) {
      await TelegramDatabase.setChatMode(telegramUserId, 'transaction');
      await TelegramBotService.sendMessage(
        chatId, 
        '📝 *Transaction Mode Activated!*\n\nYou can now record transactions only. I will ask you to confirm each transaction before saving.\n\nExamples:\n• "Beli kopi 30k pakai Gopay"\n• "Gaji 5 juta ke BCA"\n• "Tabung 500k ke BCA untuk liburan"\n• "Transfer 100k dari BCA ke Dana"\n\nUse /chat to switch back to General Chat mode.'
      );
    } else {
      await TelegramBotService.sendMessage(chatId, '❌ You are not logged in. Use /login to authenticate.');
    }
    return;
  }

  // Handle /chat command (switch to general chat mode)
  if (text === '/chat') {
    if (session.is_authenticated && session.fundy_user_id) {
      await TelegramDatabase.setChatMode(telegramUserId, 'general');
      await TelegramBotService.sendMessage(
        chatId, 
        '💬 *General Chat Mode Activated!*\n\nYou can now chat with me naturally, ask questions, and analyze your financial data.\n\nExamples:\n• "Analisis pengeluaran bulan ini"\n• "Berapa total pengeluaran?"\n• "Show me my budget status"\n\nUse /transaction to switch to Transaction Mode for recording transactions.'
      );
    } else {
      await TelegramBotService.sendMessage(chatId, '❌ You are not logged in. Use /login to authenticate.');
    }
    return;
  }

  // Handle /savings command
  if (text === '/savings') {
    if (session.is_authenticated && session.fundy_user_id) {
      try {
        const savingsGoals = await SavingsGoalDatabase.getAllSavingsGoals(session.fundy_user_id);
        
        if (savingsGoals.length === 0) {
          await TelegramBotService.sendMessage(chatId, '📊 *Your Savings Goals*\n\nNo savings goals yet. Add savings goals on the main website: fundy.id');
        } else {
          let message = '📊 *Your Savings Goals*\n\n';
          
          for (const goal of savingsGoals) {
            // Get actual current amount from allocated_amount field
            const currentAmount = Math.round(parseFloat(goal.allocated_amount?.toString() || '0') || 0);
            const targetAmount = Math.round(goal.target_amount);
            
            message += `🎯 *${goal.goal_name}*\n`;
            message += `💰 Current: Rp${currentAmount.toLocaleString()}\n`;
            message += `🎯 Target: Rp${targetAmount.toLocaleString()}\n`;
            message += `📅 Target Date: ${goal.target_date?.toLocaleDateString() || 'No date set'}\n\n`;
          }
          
          await TelegramBotService.sendMessage(chatId, message);
        }
      } catch (error) {
        await TelegramBotService.sendMessage(chatId, '❌ Error fetching savings goals. Please try again.');
      }
    } else {
      await TelegramBotService.sendMessage(chatId, '❌ You are not logged in. Use /login to authenticate.');
    }
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
      await TelegramDatabase.setAuthState(telegramUserId.toString(), 'awaiting_email');
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

    // Get current chat mode
    const chatMode = await TelegramDatabase.getChatMode(telegramUserId);
    console.log(`💬 Chat mode for user ${telegramUserId}: ${chatMode}`);

    // Get user wallets
    const userWallets = await UserWalletDatabase.getAllWallets(userId);

    // Check if this is a structured transaction format first (faster, no AI needed)
    const structuredResult = parseStructuredTransaction(text);
    let decision: any;
    let intent: string;

    if (structuredResult) {
      console.log('📝 Detected structured transaction format, skipping AI processing');
      decision = structuredResult;
      intent = structuredResult.intent;
    } else {
      // Use the same AI decision logic as web chat
      decision = await GroqAIService.decideAndParse(text, userId);
      intent = decision.intent;
    }

    let response = '';
    let transactionCreated = false;

    // In transaction mode, block non-transaction intents
    if (chatMode === 'transaction' && intent !== 'transaction' && intent !== 'multiple_transaction') {
      response = "📝 *You're in Transaction Mode!*\n\nThis mode is for recording transactions only.\n\n" +
                 "To analyze your data or have a general conversation, please switch to General Chat mode using /chat\n\n" +
                 "In Transaction Mode, you can:\n" +
                 "• Record expenses: 'Beli kopi 25rb pakai BCA'\n" +
                 "• Record income: 'Gaji 8 juta ke BCA'\n" +
                 "• Record savings: 'Nabung 1 juta ke tabungan'\n" +
                 "• Record transfers: 'Transfer 500rb dari BCA ke Dana'";
      
      await TelegramBotService.sendMessage(chatId, response);
      return;
    }

    // Handle transaction intent (support both single and multiple transactions)
    if (intent === 'transaction' || intent === 'multiple_transaction') {
      const transactions = decision.transactions || [];
      
      // In chat mode, don't process transactions - be conversational instead
      if (chatMode === 'general') {
        response = "💬 *I noticed you mentioned a transaction!*\n\n" +
                   "I'm currently in General Chat mode, which is for conversation and financial analysis.\n\n" +
                   "If you'd like to record this transaction, please:\n" +
                   "• Switch to Transaction Mode using /transaction\n" +
                   "• Then tell me about your transaction again\n\n" +
                   "Or I can help you analyze your existing financial data instead! What would you like to know?";
        
        await TelegramBotService.sendMessage(chatId, response);
        return;
      }
      
      if (transactions.length > 0) {
        // In transaction mode, show pending transactions with confirmation buttons
        if (chatMode === 'transaction') {
          // Handle both single and multiple transactions
          const validTransactions = transactions.filter((tx: any) => tx.confidence >= 0.5 && tx.amount > 0);
          
          if (validTransactions.length > 0) {
            // For multiple transactions, show them all with individual buttons
            if (validTransactions.length === 1) {
              // Single transaction - show with inline buttons
              const parsedTransaction = validTransactions[0];
              let walletId: number | undefined;
              let destinationWalletId: number | undefined;
              
              if (parsedTransaction.walletName && parsedTransaction.walletType) {
                walletId = findWalletByName(userWallets, parsedTransaction.walletName, parsedTransaction.walletType);
              }
              
              if ((parsedTransaction as any).walletNameDestination && (parsedTransaction as any).walletTypeDestination) {
                destinationWalletId = findWalletByName(userWallets, (parsedTransaction as any).walletNameDestination, (parsedTransaction as any).walletTypeDestination);
              } else if ((parsedTransaction as any).walletName2 && (parsedTransaction as any).walletType2) {
                destinationWalletId = findWalletByName(userWallets, (parsedTransaction as any).walletName2, (parsedTransaction as any).walletType2);
              }

              // Store pending transaction
              const pendingTxId = `${telegramUserId}_${Date.now()}`;
              const pendingTx = {
                ...parsedTransaction,
                walletId,
                destinationWalletId,
                userId,
                telegramUserId,
                chatId
              };
              pendingTransactions.set(pendingTxId, pendingTx);

              // Build confirmation message
              let confirmMessage = `📝 *Transaction Preview*\n\n`;
              confirmMessage += `*Type:* ${parsedTransaction.type.toUpperCase()}\n`;
              confirmMessage += `*Description:* ${parsedTransaction.description}\n`;
              confirmMessage += `*Amount:* Rp${parsedTransaction.amount.toLocaleString()}\n`;
              
              if (parsedTransaction.type === 'expense') {
                confirmMessage += `*Category:* ${parsedTransaction.category}\n`;
                confirmMessage += `*Wallet:* ${parsedTransaction.walletName || 'Not specified'}\n`;
              } else if (parsedTransaction.type === 'income') {
                confirmMessage += `*Source:* ${parsedTransaction.source}\n`;
                confirmMessage += `*Wallet:* ${parsedTransaction.walletName || 'Not specified'}\n`;
              } else if (parsedTransaction.type === 'transfer') {
                const destWalletName = (parsedTransaction as any).walletNameDestination || (parsedTransaction as any).walletName2;
                confirmMessage += `*From:* ${parsedTransaction.walletName || 'Not specified'}\n`;
                confirmMessage += `*To:* ${destWalletName || 'Not specified'}\n`;
                const adminFee = (parsedTransaction as any).adminFee || 0;
                confirmMessage += `*Admin Fee:* Rp${adminFee.toLocaleString()}\n`;
              } else if (parsedTransaction.type === 'savings') {
                confirmMessage += `*Wallet:* ${parsedTransaction.walletName || 'Not specified'}\n`;
                const goalName = (parsedTransaction as any).savingsGoal || (parsedTransaction as any).goalName;
                if (goalName) {
                  confirmMessage += `*Goal:* ${goalName}\n`;
                }
              }

              confirmMessage += `\n_Please confirm or edit this transaction_`;

              // Send with inline keyboard
              await TelegramBotService.sendMessage(
                chatId,
                confirmMessage,
                {
                  reply_markup: TelegramBotService.createTransactionConfirmKeyboard(pendingTxId)
                }
              );
              
              return; // Don't continue processing
              } else {
                // Multiple transactions - limit to 5 for Telegram message length
                const maxTransactions = 5;
                const transactionsToProcess = validTransactions.slice(0, maxTransactions);
                
                if (validTransactions.length > maxTransactions) {
                  await TelegramBotService.sendMessage(
                    chatId,
                    `⚠️ *Too many transactions!*\n\nI can only process up to ${maxTransactions} transactions at once. Processing the first ${maxTransactions} transactions only.\n\nPlease split your transactions into smaller batches.`
                  );
                }
                
                // Multiple transactions - show all with individual confirm buttons
                let confirmMessage = `📝 *Multiple Transactions Preview*\n\n`;
                
                const pendingTxIds = [];
                
                for (let i = 0; i < transactionsToProcess.length; i++) {
                  const parsedTransaction = transactionsToProcess[i];
                let walletId: number | undefined;
                let destinationWalletId: number | undefined;
                
                if (parsedTransaction.walletName && parsedTransaction.walletType) {
                  walletId = findWalletByName(userWallets, parsedTransaction.walletName, parsedTransaction.walletType);
                }
                
                if ((parsedTransaction as any).walletNameDestination && (parsedTransaction as any).walletTypeDestination) {
                  destinationWalletId = findWalletByName(userWallets, (parsedTransaction as any).walletNameDestination, (parsedTransaction as any).walletTypeDestination);
                } else if ((parsedTransaction as any).walletName2 && (parsedTransaction as any).walletType2) {
                  destinationWalletId = findWalletByName(userWallets, (parsedTransaction as any).walletName2, (parsedTransaction as any).walletType2);
                }

                // Store pending transaction
                const pendingTxId = `${telegramUserId}_${Date.now()}_${i}`;
                const pendingTx = {
                  ...parsedTransaction,
                  walletId,
                  destinationWalletId,
                  userId,
                  telegramUserId,
                  chatId
                };
                pendingTransactions.set(pendingTxId, pendingTx);
                pendingTxIds.push(pendingTxId);

                // Add to message
                confirmMessage += `*${i + 1}. ${parsedTransaction.type.toUpperCase()}*\n`;
                confirmMessage += `Description: ${parsedTransaction.description}\n`;
                confirmMessage += `Amount: Rp${parsedTransaction.amount.toLocaleString()}\n`;
                
                if (parsedTransaction.type === 'expense') {
                  confirmMessage += `Category: ${parsedTransaction.category}\n`;
                  confirmMessage += `Wallet: ${parsedTransaction.walletName || 'Not specified'}\n`;
                } else if (parsedTransaction.type === 'income') {
                  confirmMessage += `Source: ${parsedTransaction.source}\n`;
                  confirmMessage += `Wallet: ${parsedTransaction.walletName || 'Not specified'}\n`;
                } else if (parsedTransaction.type === 'transfer') {
                  const destWalletName = (parsedTransaction as any).walletNameDestination || (parsedTransaction as any).walletName2;
                  confirmMessage += `From: ${parsedTransaction.walletName || 'Not specified'}\n`;
                  confirmMessage += `To: ${destWalletName || 'Not specified'}\n`;
                  const adminFee = (parsedTransaction as any).adminFee || 0;
                  confirmMessage += `Admin Fee: Rp${adminFee.toLocaleString()}\n`;
                } else if (parsedTransaction.type === 'savings') {
                  confirmMessage += `Wallet: ${parsedTransaction.walletName || 'Not specified'}\n`;
                  const goalName = (parsedTransaction as any).savingsGoal || (parsedTransaction as any).goalName;
                  if (goalName) {
                    confirmMessage += `Goal: ${goalName}\n`;
                  }
                }
                
                confirmMessage += `\n`;
              }

              confirmMessage += `_Please confirm each transaction individually_`;

              // Create keyboard with individual confirm buttons for each transaction
              const keyboard = {
                inline_keyboard: [] as any[]
              };

              // Add bulk action buttons first (use session ID to avoid long callback data)
              const sessionId = `${telegramUserId}_${Date.now()}`;
              sessionMappings.set(sessionId, pendingTxIds);
              keyboard.inline_keyboard.push([
                {
                  text: '✅ Confirm All',
                  callback_data: `confirm_all:${sessionId}`
                },
                {
                  text: '✏️ Edit All',
                  callback_data: `edit_all:${sessionId}`
                }
              ]);

              // Add individual confirm buttons for each transaction
              for (let i = 0; i < pendingTxIds.length; i++) {
                keyboard.inline_keyboard.push([
                  {
                    text: `✅ Confirm #${i + 1}`,
                    callback_data: `confirm_tx:${pendingTxIds[i]}`
                  },
                  {
                    text: `✏️ Edit #${i + 1}`,
                    callback_data: `edit_tx:${pendingTxIds[i]}`
                  }
                ]);
              }

              // Add cancel all button
              keyboard.inline_keyboard.push([
                {
                  text: '❌ Cancel All',
                  callback_data: 'cancel_all_tx'
                }
              ]);

              // Send with inline keyboard
              await TelegramBotService.sendMessage(
                chatId,
                confirmMessage,
                {
                  reply_markup: keyboard
                }
              );
              
              return; // Don't continue processing
            }
          }
        } else {
          // General chat mode - create transactions immediately (old behavior)
          let responses = [];
          
          for (const parsedTransaction of transactions) {
            if (parsedTransaction.confidence >= 0.5 && parsedTransaction.amount > 0) {
              let walletId: number | undefined;
              let destinationWalletId: number | undefined;
              
              if (parsedTransaction.walletName && parsedTransaction.walletType) {
                walletId = findWalletByName(userWallets, parsedTransaction.walletName, parsedTransaction.walletType);
                console.log(`🔍 Source wallet found: ${parsedTransaction.walletName} (${parsedTransaction.walletType}) -> ID: ${walletId}`);
              }
              
              // Check for destination wallet with different field names
              if ((parsedTransaction as any).walletNameDestination && (parsedTransaction as any).walletTypeDestination) {
                destinationWalletId = findWalletByName(userWallets, (parsedTransaction as any).walletNameDestination, (parsedTransaction as any).walletTypeDestination);
                console.log(`🔍 Destination wallet found: ${(parsedTransaction as any).walletNameDestination} (${(parsedTransaction as any).walletTypeDestination}) -> ID: ${destinationWalletId}`);
              } else if ((parsedTransaction as any).walletName2 && (parsedTransaction as any).walletType2) {
                destinationWalletId = findWalletByName(userWallets, (parsedTransaction as any).walletName2, (parsedTransaction as any).walletType2);
                console.log(`🔍 Destination wallet found: ${(parsedTransaction as any).walletName2} (${(parsedTransaction as any).walletType2}) -> ID: ${destinationWalletId}`);
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
                  responses.push(`✅ Expense recorded: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} in ${parsedTransaction.category} category${walletInfo}.`);
                  transactionCreated = true;
                } catch (error) {
                  responses.push(error instanceof Error ? error.message : 'Error recording expense');
                }
              } else if (parsedTransaction.type === 'income') {
                try {
                  await handleIncomeCreation(
                    userId,
                    parsedTransaction.description,
                    parsedTransaction.amount,
                    parsedTransaction.source!,
                    walletId
                  );

                  const walletInfo = walletId ? ` to ${parsedTransaction.walletName}` : '';
                  responses.push(`✅ Income recorded: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} from ${parsedTransaction.source}${walletInfo}.`);
                  transactionCreated = true;
                } catch (error) {
                  responses.push(error instanceof Error ? error.message : 'Error recording income');
                }
              } else if (parsedTransaction.type === 'transfer') {
                try {
                  await handleTransferCreation(
                    userId,
                    parsedTransaction.description,
                    parsedTransaction.amount,
                    walletId,
                    destinationWalletId,
                    (parsedTransaction as any).adminFee
                  );
                  
                  const sourceInfo = walletId ? ` from ${parsedTransaction.walletName}` : '';
                  const destWalletName = (parsedTransaction as any).walletNameDestination || (parsedTransaction as any).walletName2;
                  const destInfo = destinationWalletId ? ` to ${destWalletName}` : '';
                  const adminInfo = (parsedTransaction as any).adminFee ? ` (Admin fee: Rp${(parsedTransaction as any).adminFee.toLocaleString()})` : '';
                  responses.push(`✅ Transfer recorded: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()}${sourceInfo}${destInfo}${adminInfo}.`);
                  transactionCreated = true;
                } catch (error) {
                  responses.push(error instanceof Error ? error.message : 'Error recording transfer');
                }
              } else if (parsedTransaction.type === 'savings') {
                try {
                  await handleSavingsCreation(
                    userId,
                    parsedTransaction.description,
                    parsedTransaction.amount,
                    walletId,
                    (parsedTransaction as any).savingsGoal
                  );
                  
                  const walletInfo = walletId ? ` to ${parsedTransaction.walletName}` : '';
                  const goalInfo = (parsedTransaction as any).savingsGoal ? ` for ${(parsedTransaction as any).savingsGoal}` : '';
                  responses.push(`✅ Savings recorded: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()}${walletInfo}${goalInfo}.`);
                  transactionCreated = true;
                } catch (error) {
                  responses.push(error instanceof Error ? error.message : 'Error recording savings');
                }
              }
            }
          }
          
          response = responses.join('\n\n');
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

    // Format and send response with proper Telegram markdown
    const formattedResponse = TelegramBotService.formatAIResponse(response);
    
    // Split long messages into chunks (Telegram has 4096 character limit)
    const MAX_MESSAGE_LENGTH = 4000; // Leave some buffer
    
    if (formattedResponse.length <= MAX_MESSAGE_LENGTH) {
      // Send as single message with markdown parsing
      await TelegramBotService.sendMessage(chatId, formattedResponse, { parse_mode: 'Markdown' });
    } else {
      // Split by paragraphs (double newlines) to keep context together
      const paragraphs = formattedResponse.split('\n\n');
      let currentChunk = '';
      
      for (const paragraph of paragraphs) {
        // If adding this paragraph exceeds limit, send current chunk first
        if (currentChunk.length + paragraph.length + 2 > MAX_MESSAGE_LENGTH) {
          if (currentChunk) {
            await TelegramBotService.sendMessage(chatId, currentChunk.trim(), { parse_mode: 'Markdown' });
            // Small delay between messages
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          currentChunk = paragraph;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }
      
      // Send remaining chunk
      if (currentChunk) {
        await TelegramBotService.sendMessage(chatId, currentChunk.trim(), { parse_mode: 'Markdown' });
      }
    }

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

// Handle callback queries (inline button presses)
async function handleCallbackQuery(callbackQuery: any) {
  const callbackQueryId = callbackQuery.id;
  const data = callbackQuery.data;
  const telegramUserId = callbackQuery.from.id.toString();
  const chatId = callbackQuery.message?.chat?.id?.toString();
  const messageId = callbackQuery.message?.message_id;

  if (!chatId || !messageId) {
    console.error('Missing chat ID or message ID in callback query');
    return;
  }

  console.log(`🔘 Callback query received: ${data} from user ${telegramUserId}`);

  try {
    // Handle cancel
    if (data === 'cancel_tx') {
      await TelegramBotService.answerCallbackQuery(callbackQueryId, 'Transaction cancelled');
      await TelegramBotService.editMessageText(
        chatId,
        messageId,
        '❌ *Transaction Cancelled*\n\nThe transaction was not recorded.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Handle cancel all
    if (data === 'cancel_all_tx') {
      await TelegramBotService.answerCallbackQuery(callbackQueryId, 'All transactions cancelled');
      await TelegramBotService.editMessageText(
        chatId,
        messageId,
        '❌ *All Transactions Cancelled*\n\nNo transactions were recorded.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Handle confirm all
    if (data.startsWith('confirm_all:')) {
      const sessionId = data.replace('confirm_all:', '');
      const pendingTxIds = sessionMappings.get(sessionId) || [];
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const pendingTxId of pendingTxIds) {
        const pendingTx = pendingTransactions.get(pendingTxId);
        if (!pendingTx) continue;

        try {
          if (pendingTx.type === 'expense') {
            await handleExpenseCreation(
              pendingTx.userId,
              pendingTx.description,
              pendingTx.amount,
              pendingTx.category,
              pendingTx.walletId
            );
          } else if (pendingTx.type === 'income') {
            await handleIncomeCreation(
              pendingTx.userId,
              pendingTx.description,
              pendingTx.amount,
              pendingTx.source,
              pendingTx.walletId
            );
          } else if (pendingTx.type === 'transfer') {
            await handleTransferCreation(
              pendingTx.userId,
              pendingTx.description,
              pendingTx.amount,
              pendingTx.walletId,
              pendingTx.destinationWalletId,
              pendingTx.adminFee
            );
          } else if (pendingTx.type === 'savings') {
            await handleSavingsCreation(
              pendingTx.userId,
              pendingTx.description,
              pendingTx.amount,
              pendingTx.walletId,
              pendingTx.savingsGoal || pendingTx.goalName
            );
          }

          // Remove from pending
          pendingTransactions.delete(pendingTxId);
          successCount++;
        } catch (error) {
          failCount++;
          errors.push(`${pendingTx.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      await TelegramBotService.answerCallbackQuery(
        callbackQueryId, 
        `✅ Confirmed ${successCount} transactions${failCount > 0 ? `, ${failCount} failed` : ''}`
      );

      let resultMessage = `✅ *Bulk Transaction Results*\n\n`;
      resultMessage += `✅ Confirmed: ${successCount}\n`;
      if (failCount > 0) {
        resultMessage += `❌ Failed: ${failCount}\n`;
        resultMessage += `\n*Errors:*\n${errors.join('\n')}`;
      }

      await TelegramBotService.editMessageText(
        chatId,
        messageId,
        resultMessage,
        { parse_mode: 'Markdown' }
      );
      
      // Clean up session mapping
      sessionMappings.delete(sessionId);
      return;
    }

    // Handle confirm
    if (data.startsWith('confirm_tx:')) {
      const pendingTxId = data.replace('confirm_tx:', '');
      const pendingTx = pendingTransactions.get(pendingTxId);

      if (!pendingTx) {
        await TelegramBotService.answerCallbackQuery(callbackQueryId, 'Transaction expired. Please try again.', true);
        return;
      }

      // Create the transaction
      try {
        let result = null;
        
        if (pendingTx.type === 'expense') {
          result = await handleExpenseCreation(
            pendingTx.userId,
            pendingTx.description,
            pendingTx.amount,
            pendingTx.category,
            pendingTx.walletId
          );
        } else if (pendingTx.type === 'income') {
          result = await handleIncomeCreation(
            pendingTx.userId,
            pendingTx.description,
            pendingTx.amount,
            pendingTx.source,
            pendingTx.walletId
          );
        } else if (pendingTx.type === 'transfer') {
          await handleTransferCreation(
            pendingTx.userId,
            pendingTx.description,
            pendingTx.amount,
            pendingTx.walletId,
            pendingTx.destinationWalletId,
            pendingTx.adminFee
          );
        } else if (pendingTx.type === 'savings') {
          await handleSavingsCreation(
            pendingTx.userId,
            pendingTx.description,
            pendingTx.amount,
            pendingTx.walletId,
            pendingTx.savingsGoal || pendingTx.goalName
          );
        }

        // Remove from pending
        pendingTransactions.delete(pendingTxId);

        // Update message
        await TelegramBotService.answerCallbackQuery(callbackQueryId, '✅ Transaction confirmed!');
        await TelegramBotService.editMessageText(
          chatId,
          messageId,
          `✅ *Transaction Confirmed!*\n\n*${pendingTx.type.toUpperCase()}:* ${pendingTx.description}\n*Amount:* Rp${pendingTx.amount.toLocaleString()}\n\nSuccessfully recorded!`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error confirming transaction:', error);
        await TelegramBotService.answerCallbackQuery(
          callbackQueryId,
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          true
        );
      }
      return;
    }

    // Handle edit all
    if (data.startsWith('edit_all:')) {
      const sessionId = data.replace('edit_all:', '');
      const pendingTxIds = sessionMappings.get(sessionId) || [];
      const transactions = [];

      for (const pendingTxId of pendingTxIds) {
        const pendingTx = pendingTransactions.get(pendingTxId);
        if (pendingTx) {
          transactions.push(pendingTx);
        }
      }

      if (transactions.length === 0) {
        await TelegramBotService.answerCallbackQuery(callbackQueryId, 'No transactions found to edit', true);
        return;
      }

      // Get user's actual wallets
      const userWallets = await UserWalletDatabase.getAllWallets(transactions[0].userId);
      const walletNames = userWallets.map(w => w.name).join(', ');
      
      // Standard category list for all users
      const categoryList = EXPENSE_CATEGORIES.join(', ');

      // Create key-value format for all transactions
      let keyValueTemplate = '';
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        keyValueTemplate += `# Transaction ${i + 1}\n`;
        
        if (tx.type === 'expense') {
          keyValueTemplate += `type: expense
description: ${tx.description}
amount: ${tx.amount}
category: ${tx.category}
wallet: ${tx.walletName || 'WALLET_NAME'}`;
        } else if (tx.type === 'income') {
          keyValueTemplate += `type: income
description: ${tx.description}
amount: ${tx.amount}
source: ${tx.source}
wallet: ${tx.walletName || 'WALLET_NAME'}`;
        } else if (tx.type === 'transfer') {
          const destWalletName = (tx as any).walletNameDestination || (tx as any).walletName2 || 'DESTINATION_WALLET';
          keyValueTemplate += `type: transfer
description: ${tx.description}
amount: ${tx.amount}
from_wallet: ${tx.walletName || 'SOURCE_WALLET'}
to_wallet: ${destWalletName}
admin_fee: ${(tx as any).adminFee || 0}`;
        } else if (tx.type === 'savings') {
          keyValueTemplate += `type: savings
description: ${tx.description}
amount: ${tx.amount}
wallet: ${tx.walletName || 'WALLET_NAME'}
goal: ${(tx as any).savingsGoal || (tx as any).goalName || 'GOAL_NAME'}`;
        }
        
        if (i < transactions.length - 1) {
          keyValueTemplate += '\n\n';
        }
      }

      // Remove all pending transactions since user will create new ones
      for (const pendingTxId of pendingTxIds) {
        pendingTransactions.delete(pendingTxId);
      }
      
      // Clean up session mapping
      sessionMappings.delete(sessionId);

      await TelegramBotService.answerCallbackQuery(callbackQueryId, 'Edit template sent!');
      
      // Send instructions first
      await TelegramBotService.editMessageText(
        chatId,
        messageId,
        `✏️ *Edit All Transactions (Structured Format)*\n\nCopy the template below, modify the values, and send it back:\n\n_This will replace all ${transactions.length} transactions with your edited versions._\n\n*Your wallets:* ${walletNames}\n*Available categories:* ${categoryList}\n*Available sources:* ${INCOME_SOURCES.join(', ')}`,
        { parse_mode: 'Markdown' }
      );

      // Send key-value template in separate message for easy copying
      await TelegramBotService.sendMessage(
        chatId,
        `\`\`\`\n${keyValueTemplate}\n\`\`\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Handle edit
    if (data.startsWith('edit_tx:')) {
      const pendingTxId = data.replace('edit_tx:', '');
      const pendingTx = pendingTransactions.get(pendingTxId);

      if (!pendingTx) {
        await TelegramBotService.answerCallbackQuery(callbackQueryId, 'Transaction expired. Please try again.', true);
        return;
      }

      // Get user's actual wallets
      const userWallets = await UserWalletDatabase.getAllWallets(pendingTx.userId);
      const walletNames = userWallets.map(w => w.name).join(', ');
      
      // Standard category list for all users
      const categoryList = EXPENSE_CATEGORIES.join(', ');

      // Generate instructions message
      let instructionsMessage = `✏️ *Edit Transaction (Structured Format)*\n\n`;
      instructionsMessage += `Copy the template below, modify the values, and send it back:\n\n`;
      
      if (pendingTx.type === 'expense') {
        instructionsMessage += `*Available categories:* ${categoryList}\n`;
        instructionsMessage += `*Your wallets:* ${walletNames}`;
      } else if (pendingTx.type === 'income') {
        instructionsMessage += `*Available sources:* ${INCOME_SOURCES.join(', ')}\n`;
        instructionsMessage += `*Your wallets:* ${walletNames}`;
      } else if (pendingTx.type === 'transfer') {
        instructionsMessage += `*Your wallets:* ${walletNames}`;
      } else if (pendingTx.type === 'savings') {
        instructionsMessage += `*Your wallets:* ${walletNames}`;
      }

      instructionsMessage += `\n\n_Just modify the values and send back - no AI processing needed!_`;

      // Remove the pending transaction since user will create a new one
      pendingTransactions.delete(pendingTxId);

      await TelegramBotService.answerCallbackQuery(callbackQueryId, 'Edit template sent!');
      
      // Send instructions first
      await TelegramBotService.editMessageText(
        chatId,
        messageId,
        instructionsMessage,
        { parse_mode: 'Markdown' }
      );

      // Send key-value template in separate message for easy copying
      let keyValueTemplate = '';
      if (pendingTx.type === 'expense') {
        keyValueTemplate = `type: expense
description: ${pendingTx.description}
amount: ${pendingTx.amount}
category: ${pendingTx.category}
wallet: ${pendingTx.walletName || 'WALLET_NAME'}`;
      } else if (pendingTx.type === 'income') {
        keyValueTemplate = `type: income
description: ${pendingTx.description}
amount: ${pendingTx.amount}
source: ${pendingTx.source}
wallet: ${pendingTx.walletName || 'WALLET_NAME'}`;
      } else if (pendingTx.type === 'transfer') {
        const destWalletName = (pendingTx as any).walletNameDestination || (pendingTx as any).walletName2 || 'DESTINATION_WALLET';
        keyValueTemplate = `type: transfer
description: ${pendingTx.description}
amount: ${pendingTx.amount}
from_wallet: ${pendingTx.walletName || 'SOURCE_WALLET'}
to_wallet: ${destWalletName}
admin_fee: ${(pendingTx as any).adminFee || 0}`;
      } else if (pendingTx.type === 'savings') {
        const goalName = (pendingTx as any).savingsGoal || (pendingTx as any).goalName || 'GOAL_NAME';
        keyValueTemplate = `type: savings
description: ${pendingTx.description}
amount: ${pendingTx.amount}
wallet: ${pendingTx.walletName || 'WALLET_NAME'}
goal: ${goalName}`;
      }

      await TelegramBotService.sendMessage(
        chatId,
        `\`\`\`\n${keyValueTemplate}\n\`\`\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

  } catch (error) {
    console.error('Error handling callback query:', error);
    await TelegramBotService.answerCallbackQuery(
      callbackQueryId,
      'An error occurred. Please try again.',
      true
    );
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

    // Handle callback queries (inline button presses)
    if (update.callback_query) {
      try {
        console.log('🔘 Processing callback query...');
        await handleCallbackQuery(update.callback_query);
        console.log('✅ Callback query processing completed');
      } catch (error) {
        console.error('❌ Error handling callback query:', error);
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      }
    }
    // Handle regular messages
    else if (update.message) {
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



