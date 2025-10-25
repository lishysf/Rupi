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

// Handle incoming Telegram messages
async function handleMessage(update: TelegramUpdate) {
  const message = update.message;
  
  if (!message || !message.text) {
    return;
  }

  const telegramUserId = message.from.id.toString();
  const chatId = message.chat.id.toString();
  const text = message.text.trim();
  const username = message.from.username;
  const firstName = message.from.first_name;
  const lastName = message.from.last_name;

  console.log(`📱 Telegram message from ${firstName} (${telegramUserId}): ${text}`);

  // Initialize tables if needed
  try {
    await TelegramDatabase.initializeTables();
  } catch (error) {
    console.error('Error initializing tables:', error);
  }

  // Get or create session
  const session = await TelegramDatabase.getOrCreateSession(
    telegramUserId,
    chatId,
    username,
    firstName,
    lastName
  );

  // Handle /start command
  if (text === '/start') {
    const welcomeMessage = `👋 Welcome to *Fundy AI Assistant*!\n\nI can help you manage your finances through Telegram.\n\n🔐 *To get started, you need to login with your Fundy account.*\n\nUse /login to authenticate with your email and password.\n\nOnce logged in, you can:\n• Record expenses and income\n• Analyze your spending\n• Track your budgets\n• And much more!\n\nTry /help to see all available commands.`;
    
    await TelegramBotService.sendMessage(chatId, welcomeMessage);
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
    if (session.is_authenticated) {
      await TelegramBotService.sendMessage(chatId, '✅ You are already logged in! Use /logout to logout first.');
      return;
    }

    userStates.set(telegramUserId, { state: 'awaiting_email' });
    await TelegramBotService.sendMessage(chatId, '📧 Please enter your Fundy account email:');
    return;
  }

  // Handle /logout command
  if (text === '/logout') {
    await TelegramDatabase.logoutUser(telegramUserId);
    userStates.delete(telegramUserId);
    await TelegramBotService.sendMessage(chatId, '👋 You have been logged out successfully.');
    return;
  }

  // Handle authentication flow
  const userState = userStates.get(telegramUserId);
  
  if (userState) {
    if (userState.state === 'awaiting_email') {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(text)) {
        await TelegramBotService.sendMessage(chatId, '❌ Invalid email format. Please enter a valid email:');
        return;
      }

      userStates.set(telegramUserId, { state: 'awaiting_password', email: text });
      await TelegramBotService.sendMessage(chatId, '🔒 Please enter your password:');
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
          userStates.delete(telegramUserId);
          return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isPasswordValid) {
          await TelegramBotService.sendMessage(chatId, '❌ Invalid email or password. Please try /login again.');
          userStates.delete(telegramUserId);
          return;
        }

        // Authenticate session
        await TelegramDatabase.authenticateUser(telegramUserId, user.id);
        userStates.delete(telegramUserId);

        await TelegramBotService.sendMessage(
          chatId, 
          `✅ *Login successful!*\n\nWelcome back, ${user.name}!\n\nYou can now chat with me to manage your finances. Try:\n• "Beli kopi 30k pakai Gopay"\n• "Analisis pengeluaran bulan ini"`
        );
      } catch (error) {
        console.error('Authentication error:', error);
        await TelegramBotService.sendMessage(chatId, '❌ Authentication failed. Please try /login again.');
        userStates.delete(telegramUserId);
      }
      return;
    }
  }

  // Check if user is authenticated for regular chat
  if (!session.is_authenticated || !session.fundy_user_id) {
    await TelegramBotService.sendMessage(
      chatId, 
      '🔐 Please login first using /login to chat with me.'
    );
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
    await TelegramBotService.sendMessage(
      chatId, 
      '❌ Sorry, I had trouble processing your message. Please try again.'
    );
  }
}

// Webhook endpoint - handle POST requests from Telegram
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const update = body as TelegramUpdate;

    console.log('📨 Telegram webhook received:', JSON.stringify(update, null, 2));

    // Process message in background
    handleMessage(update).catch(error => {
      console.error('Error handling telegram message:', error);
    });

    // Return 200 immediately to Telegram
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
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



