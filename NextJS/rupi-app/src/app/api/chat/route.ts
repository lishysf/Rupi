import { NextRequest, NextResponse } from 'next/server';
import { GroqAIService } from '@/lib/groq-ai';
import { TransactionDatabase, UserWalletDatabase, BudgetDatabase, SavingsGoalDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';
import { PerformanceMonitor } from '@/lib/performance-monitor';

// Prepare optimized financial context for AI (token-efficient)
async function prepareFinancialContext(userId: number) {
  // Get current date in Indonesia timezone
  const now = new Date();
  const indonesiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const currentYear = indonesiaTime.getFullYear();
  const currentMonth = indonesiaTime.getMonth();
  
  // Get start of current month in Indonesia time
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Get all recent transactions (last 3 months to be safe)
  const allTransactions = await TransactionDatabase.getUserTransactions(userId, 1000, 0);
  
  // Filter by this month (using Indonesia timezone)
  const thisMonthTransactions = allTransactions.filter(t => {
    const txDate = new Date(t.created_at);
    // Convert to Indonesia time for comparison
    const txIndonesiaTime = new Date(txDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return txIndonesiaTime.getMonth() === currentMonth && txIndonesiaTime.getFullYear() === currentYear;
  });

  // Calculate totals
  const expenses = thisMonthTransactions.filter(t => t.type === 'expense');
  const income = thisMonthTransactions.filter(t => t.type === 'income');
  const savings = thisMonthTransactions.filter(t => t.type === 'savings');

  const sum = (arr: any[]) => arr.reduce((s, t) => s + (typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)), 0);
  
  const totalExpense = sum(expenses);
  const totalIncome = sum(income);
  const totalSavings = sum(savings);

  // Get total wallet balance
  const wallets = await UserWalletDatabase.getAllWalletsWithBalances(userId);
  const totalWalletBalance = (wallets as any[]).reduce((s, w) => {
    const balance = typeof w.balance === 'string' ? parseFloat(w.balance) : (w.balance || 0);
    return s + balance;
  }, 0);

  // Get savings goals (for goals data)
  const savingsGoals = await SavingsGoalDatabase.getAllSavingsGoals(userId);
  
  // Calculate total savings from actual savings transactions (not goals)
  const userTransactions = await TransactionDatabase.getUserTransactions(userId);
  const savingsTransactions = userTransactions.filter(t => t.type === 'savings');
  const totalSavingsAmount = savingsTransactions.reduce((sum, t) => sum + (typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount), 0);
  
  const goalsData = savingsGoals.map(g => ({
    name: g.goal_name,
    target: g.target_amount,
    current: g.current_amount
  }));

  // Calculate total assets (wallet balance + savings)
  const totalAssets = totalWalletBalance + totalSavingsAmount;

  // Calculate expense breakdown by category (all categories with totals)
  const expensesByCategory: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category || 'Others';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (typeof e.amount === 'string' ? parseFloat(e.amount) : (e.amount || 0));
  });

  // Get top 3 expense categories
  const top3Categories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat, total]) => ({ category: cat, total }));

  // Get today's transactions (for "today" queries)
  const todayExpenses = expenses.filter(e => {
    const txDate = new Date(e.created_at);
    const txIndonesiaTime = new Date(txDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return txIndonesiaTime.getDate() === indonesiaTime.getDate() &&
           txIndonesiaTime.getMonth() === currentMonth &&
           txIndonesiaTime.getFullYear() === currentYear;
  }).map(e => ({ 
    desc: e.description, 
    amt: typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount, 
    cat: e.category 
  }));

  const todayIncome = income.filter(i => {
    const txDate = new Date(i.created_at);
    const txIndonesiaTime = new Date(txDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return txIndonesiaTime.getDate() === indonesiaTime.getDate() &&
           txIndonesiaTime.getMonth() === currentMonth &&
           txIndonesiaTime.getFullYear() === currentYear;
  }).map(i => ({ 
    desc: i.description, 
    amt: typeof i.amount === 'string' ? parseFloat(i.amount) : i.amount, 
    source: i.source 
  }));

  // Get 3 most recent expenses (summary only)
  const recentExpenses = expenses
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)
    .map(e => ({ 
      desc: e.description, 
      amt: typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount, 
      cat: e.category 
    }));

  // Format date/time in Indonesia timezone (already calculated above)
  const dateString = indonesiaTime.toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeString = indonesiaTime.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  // Calculate today's totals
  const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + e.amt, 0);
  const todayIncomeTotal = todayIncome.reduce((sum, i) => sum + i.amt, 0);

  // Build ultra-compact context string
  const context = {
    d: dateString,
    t: `${timeString} WIB`,
    a: totalAssets,
    w: totalWalletBalance,
    s: totalSavingsAmount,
    me: totalExpense,
    mi: totalIncome,
    te: todayExpenseTotal,
    ti: todayIncomeTotal,
    tc: top3Categories.slice(0, 3),
    tl: todayExpenses.slice(0, 3), // Reduced from 5 to 3
    g: goalsData.slice(0, 2) // Reduced from 3 to 2
  };

  const contextString = JSON.stringify(context, null, 0);
  console.log(`📊 Web chat context size: ${contextString.length} characters`);
  
  return contextString;
}

// Helper function to find wallet by name efficiently (with caching)
function findWalletByName(wallets: Array<{id: number, name: string}>, walletName: string | undefined, walletType: string | undefined): number | undefined {
  if (!walletName || !walletType) return undefined;
  
  const walletNameLower = walletName.toLowerCase();
  
  // Try exact match first
  let matchingWallet = wallets.find(w => w.name.toLowerCase() === walletNameLower);
  
  // If no exact match, try partial match (wallet name contains the mentioned name)
  if (!matchingWallet) {
    matchingWallet = wallets.find(w => w.name.toLowerCase().includes(walletNameLower));
  }
  
  // If still no match, try reverse (mentioned name contains wallet name)
  if (!matchingWallet) {
    matchingWallet = wallets.find(w => walletNameLower.includes(w.name.toLowerCase()));
  }
  
  return matchingWallet?.id;
}

// Helper function to handle expense creation
async function handleExpenseCreation(userId: number, description: string, amount: number, category: string, walletId?: number) {
  // Always require a wallet for expenses
  if (!walletId) {
    throw new Error('Please specify which wallet to use for this expense. For example: "Beli kopi 50rb pakai BCA" or "Bayar listrik 200rb dari Gojek".');
  }

  // Verify wallet exists
  const wallets = await UserWalletDatabase.getAllWallets(userId);
  const wallet = wallets.find(w => w.id === walletId);
  
  if (!wallet) {
    throw new Error('Specified wallet not found');
  }

  // Check if wallet has sufficient balance (calculated from transactions)
  PerformanceMonitor.startTimer('wallet-balance-calculation');
  const currentBalance = await TransactionDatabase.calculateWalletBalance(userId, walletId);
  PerformanceMonitor.endTimer('wallet-balance-calculation');
  
  if (currentBalance < amount) {
    throw new Error(`Insufficient balance in ${wallet.name}. Current balance: Rp${currentBalance.toLocaleString()}, Required: Rp${amount.toLocaleString()}`);
  }
  
  console.log('Expense creation debug:', {
    userId,
    description,
    amount,
    category,
    walletId,
    walletName: wallet.name,
    currentBalance: currentBalance,
    newBalance: currentBalance - amount
  });
  
  // Create expense using unified transaction system
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
  // Always require a wallet for income
  if (!walletId) {
    throw new Error('Please specify which wallet to receive this income. For example: "Gaji 5 juta ke BCA" or "Bonus 1 juta ke Gojek".');
  }

  // Verify wallet exists
  const wallets = await UserWalletDatabase.getAllWallets(userId);
  const wallet = wallets.find(w => w.id === walletId);
  
  if (!wallet) {
    throw new Error('Specified wallet not found');
  }

  // Get current balance (calculated from transactions)
  PerformanceMonitor.startTimer('wallet-balance-calculation-income');
  const currentBalance = await TransactionDatabase.calculateWalletBalance(userId, walletId);
  PerformanceMonitor.endTimer('wallet-balance-calculation-income');
  const newBalance = currentBalance + amount;
  
  console.log('Income creation debug:', {
    userId,
    description,
    amount,
    source,
    walletId,
    walletName: wallet.name,
    currentBalance: currentBalance,
    newBalance: newBalance
  });
  
  // Create income using unified transaction system
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

// Helper function to handle wallet-to-wallet transfers
async function handleWalletTransfer(userId: number, description: string, amount: number, fromWalletId?: number, toWalletId?: number) {
  if (!fromWalletId || !toWalletId) {
    throw new Error('Please specify both source and destination wallets. For example: "Transfer 1 juta dari BCA ke GoPay" or "Pindah 500rb dari Mandiri ke Dana".');
  }

  if (fromWalletId === toWalletId) {
    throw new Error('Cannot transfer to the same wallet');
  }

  // Verify both wallets exist and belong to user
  const wallets = await UserWalletDatabase.getAllWallets(userId);
  const fromWallet = wallets.find(w => w.id === fromWalletId);
  const toWallet = wallets.find(w => w.id === toWalletId);
  
  if (!fromWallet) {
    throw new Error('Source wallet not found');
  }
  
  if (!toWallet) {
    throw new Error('Destination wallet not found');
  }

  // Check if source wallet has sufficient balance
  const currentBalance = await UserWalletDatabase.calculateWalletBalance(userId, fromWalletId);
  
  if (currentBalance < amount) {
    throw new Error(`Insufficient balance in ${fromWallet.name}. Current balance: Rp${currentBalance.toLocaleString()}, Required: Rp${amount.toLocaleString()}`);
  }

  // Create paired transfer transactions using the unified transaction system
  const { TransactionDatabase } = await import('@/lib/database');

  // Outgoing transaction (source wallet)
  const outgoing = await TransactionDatabase.createTransaction(
    userId,
    `Transfer to ${toWallet.name}${description ? `: ${description}` : ''}`,
    -amount,
    'transfer',
    fromWalletId,
    'Transfer',
    undefined,
    undefined,
    undefined,
    'wallet_to_wallet',
    new Date()
  );

  // Incoming transaction (destination wallet)
  const incoming = await TransactionDatabase.createTransaction(
    userId,
    `Transfer from ${fromWallet.name}${description ? `: ${description}` : ''}`,
    amount,
    'transfer',
    toWalletId,
    'Transfer',
    undefined,
    undefined,
    undefined,
    'wallet_to_wallet',
    new Date()
  );

  return { success: true, outgoing, incoming };
}

// Helper function to handle savings transfers with wallet balance validation
async function handleSavingsTransfer(userId: number, description: string, amount: number, goalName?: string, walletId?: number) {
  const descriptionLower = description.toLowerCase();
  
  // Check for transfer TO savings (deposit) keywords
  const isTransferToSavings = descriptionLower.includes('transfer to') || 
                             descriptionLower.includes('tabung') ||
                             descriptionLower.includes('simpan') ||
                             descriptionLower.includes('nabung') ||
                             descriptionLower.includes('transfer ke tabungan') ||
                             descriptionLower.includes('masuk ke tabungan') ||
                             descriptionLower.includes('to savings') ||
                             descriptionLower.includes('saving to') ||
                             (descriptionLower.includes('savings') && descriptionLower.includes('to')) ||
                             (descriptionLower.includes('saving') && descriptionLower.includes('to'));
  
  // Check for transfer FROM savings (withdrawal) keywords
  const isTransferFromSavings = descriptionLower.includes('ambil') ||
                               descriptionLower.includes('pakai') ||
                               descriptionLower.includes('tarik') ||
                               descriptionLower.includes('tarik dari tabungan') ||
                               descriptionLower.includes('transfer from') ||
                               descriptionLower.includes('keluar dari tabungan') ||
                               descriptionLower.includes('withdraw') ||
                               descriptionLower.includes('from savings') ||
                               descriptionLower.includes('savings to') ||
                               (descriptionLower.includes('savings') && descriptionLower.includes('from'));
  
  // Determine if it's a deposit or withdrawal
  // If both are true, prioritize the more specific keywords
  let isDeposit = false;
  
  if (isTransferToSavings && !isTransferFromSavings) {
    isDeposit = true;
  } else if (isTransferFromSavings && !isTransferToSavings) {
    isDeposit = false;
  } else if (isTransferToSavings && isTransferFromSavings) {
    // Both are true - use more specific keywords to determine
    if (descriptionLower.includes('to savings') || descriptionLower.includes('tabung') || descriptionLower.includes('simpan')) {
      isDeposit = true;
    } else if (descriptionLower.includes('from savings') || descriptionLower.includes('ambil') || descriptionLower.includes('pakai')) {
      isDeposit = false;
    } else {
      // Default to withdrawal if unclear
      isDeposit = false;
    }
  } else {
    // Neither is true - default to deposit if wallet is specified (money from wallet to savings)
    isDeposit = walletId ? true : false;
  }
  
  console.log('Savings direction debug:', {
    originalDescription: description,
    descriptionLower,
    isTransferToSavings,
    isTransferFromSavings,
    isDeposit,
    walletId,
    containsTabung: descriptionLower.includes('tabung'),
    containsNabung: descriptionLower.includes('nabung'),
    containsSimpan: descriptionLower.includes('simpan')
  });
  
  if (isDeposit) {
    // Transfer TO savings: Require wallet selection
    if (!walletId) {
      throw new Error('Please specify which wallet to transfer from. For example: "Tabung 1 juta dari BCA" or "Transfer 500 ribu ke tabungan dari Gojek".');
    }
    
    // Verify wallet exists and has sufficient balance
    const wallets = await UserWalletDatabase.getAllWallets(userId);
    const wallet = wallets.find(w => w.id === walletId);
    
    if (!wallet) {
      throw new Error('Specified wallet not found');
    }
    
    const currentBalance = await TransactionDatabase.calculateWalletBalance(userId, walletId);
    
    if (currentBalance < amount) {
      throw new Error(`Insufficient balance in ${wallet.name} for savings transfer. Current balance: Rp${currentBalance.toLocaleString()}, Required: Rp${amount.toLocaleString()}`);
    }
    
    // Create savings transaction using unified system
    const savings = await TransactionDatabase.createTransaction(
      userId,
      description,
      amount,
      'savings',
      walletId,
      undefined,
      undefined,
      goalName,
      undefined,
      'wallet_to_savings',
      new Date()
    );
    
    // Create wallet to savings transfer using unified transaction system
    // The savings transaction was already created above, no need for additional transfer
    
    return savings;
  } else {
    // Transfer FROM savings: Check if savings balance is sufficient
    // Calculate total savings from transactions
    const savingsTransactions = await TransactionDatabase.getUserTransactions(userId);
    const totalSavings = savingsTransactions
      .filter(t => t.type === 'savings')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    
    if (totalSavings < amount) {
      throw new Error(`Insufficient savings balance. Current savings: Rp${totalSavings.toLocaleString()}, Required: Rp${amount.toLocaleString()}`);
    }
    
     // Create savings withdrawal transaction using unified system
     const savings = await TransactionDatabase.createTransaction(
       userId,
       description,
       -amount, // Negative amount for withdrawal
       'savings',
       undefined, // No wallet_id for savings withdrawal - it's a savings operation
       undefined,
       undefined,
       goalName,
       undefined,
       'savings_to_wallet',
       new Date()
     );
     
     // If a destination wallet is specified, create a corresponding income transaction
     if (walletId) {
       // Verify wallet exists
       const wallets = await UserWalletDatabase.getAllWallets(userId);
       const wallet = wallets.find(w => w.id === walletId);
       
       if (!wallet) {
         throw new Error('Specified destination wallet not found');
       }
       
       // Create transfer transaction in destination wallet (not income)
       await TransactionDatabase.createTransaction(
         userId,
         `Transfer from savings to ${wallet.name}`,
         amount, // Positive amount for transfer
         'transfer',
         walletId,
         'Transfer', // Transfer category
         undefined,
         undefined,
         undefined,
         'savings_to_wallet',
         new Date()
       );
     }
    
    return savings;
  }
}

// Skip database initialization - tables should already exist in production
// Database initialization should be done via migrations or during deployment, not on every request
async function ensureDbInitialized() {
  // No-op - database is already initialized
  // This prevents expensive re-initialization on every cold start
  return Promise.resolve();
}

export async function POST(request: NextRequest) {
  try {
    PerformanceMonitor.startTimer('chat-request-total');
    
    await ensureDbInitialized();
    const user = await requireAuth(request);

    const body = await request.json();
    const { message, conversationHistory, isTransactionMode: rawIsTransactionMode, action, transactionData } = body;
    
    // Ensure isTransactionMode is a boolean
    const isTransactionMode = rawIsTransactionMode === true || rawIsTransactionMode === 'true';
    
    console.log('🔍 API Debug - raw isTransactionMode:', rawIsTransactionMode, 'type:', typeof rawIsTransactionMode);
    console.log('🔍 API Debug - converted isTransactionMode:', isTransactionMode, 'type:', typeof isTransactionMode);
    console.log('🔍 API Debug - message:', message);
    console.log('🔍 API Debug - action:', action);
    console.log('🔍 API Debug - transactionData:', transactionData);
    
    // Cache user wallets to avoid multiple database queries
    PerformanceMonitor.startTimer('fetch-wallets');
    const userWallets = await UserWalletDatabase.getAllWallets(user.id);
    const walletsTime = PerformanceMonitor.endTimer('fetch-wallets');
    console.log(`Fetched ${userWallets.length} wallets for user ${user.id}`);

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message is required'
        },
        { status: 400 }
      );
    }

    // Handle transaction confirmation
    if (action === 'confirm_transaction' && transactionData) {
      console.log('🔍 API Debug - CONFIRM TRANSACTION ACTION');
      console.log('🔍 API Debug - transactionData:', transactionData);
      try {
        let createdTransaction = null;
        
        if (transactionData.type === 'expense') {
          console.log('🔍 API Debug - Creating expense transaction:', {
            userId: user.id,
            description: transactionData.description,
            amount: transactionData.amount,
            category: transactionData.category,
            walletId: transactionData.walletId
          });
          createdTransaction = await handleExpenseCreation(
            user.id,
            transactionData.description,
            transactionData.amount,
            transactionData.category!,
            transactionData.walletId
          );
          console.log('🔍 API Debug - Expense transaction created:', createdTransaction);
        } else if (transactionData.type === 'income') {
          createdTransaction = await handleIncomeCreation(
            user.id,
            transactionData.description,
            transactionData.amount,
            transactionData.source!,
            transactionData.walletId
          );
        } else if (transactionData.type === 'savings') {
          createdTransaction = await handleSavingsTransfer(
            user.id,
            transactionData.description,
            transactionData.amount,
            transactionData.goalName,
            transactionData.walletId
          );
        } else if (transactionData.type === 'transfer') {
          createdTransaction = await handleWalletTransfer(
            user.id,
            transactionData.description,
            transactionData.amount,
            transactionData.fromWalletId,
            transactionData.toWalletId
          );
        }

        console.log('🔍 API Debug - Returning confirm response:', {
          success: true,
          createdTransaction
        });
        return NextResponse.json({
          success: true,
          data: {
            response: 'Transaction confirmed and saved successfully!',
            transactionCreated: createdTransaction,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Error confirming transaction:', error);
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to confirm transaction'
        }, { status: 500 });
      }
    }

    // Handle multiple transactions confirmation
    if (action === 'confirm_multiple_transactions' && body.transactionsData) {
      console.log('🔍 API Debug - CONFIRM MULTIPLE TRANSACTIONS ACTION');
      console.log('🔍 API Debug - transactionsData:', body.transactionsData);
      
      try {
        const transactionsData = body.transactionsData as Array<any>;
        const createdTransactions = [];
        const failedTransactions = [];
        
        // Process each transaction
        for (const transactionData of transactionsData) {
          try {
            let createdTransaction = null;
            
            if (transactionData.type === 'expense') {
              createdTransaction = await handleExpenseCreation(
                user.id,
                transactionData.description,
                transactionData.amount,
                transactionData.category!,
                transactionData.walletId
              );
            } else if (transactionData.type === 'income') {
              createdTransaction = await handleIncomeCreation(
                user.id,
                transactionData.description,
                transactionData.amount,
                transactionData.source!,
                transactionData.walletId
              );
            } else if (transactionData.type === 'savings') {
              createdTransaction = await handleSavingsTransfer(
                user.id,
                transactionData.description,
                transactionData.amount,
                transactionData.goalName,
                transactionData.walletId
              );
            } else if (transactionData.type === 'transfer') {
              createdTransaction = await handleWalletTransfer(
                user.id,
                transactionData.description,
                transactionData.amount,
                transactionData.fromWalletId,
                transactionData.toWalletId
              );
            }
            
            if (createdTransaction) {
              createdTransactions.push({
                transaction: transactionData,
                created: createdTransaction
              });
            }
          } catch (error) {
            console.error('Error creating transaction:', error);
            failedTransactions.push({
              transaction: transactionData,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        
        // Generate response
        const successCount = createdTransactions.length;
        const failCount = failedTransactions.length;
        
        let responseMessage = '';
        if (successCount > 0) {
          responseMessage = `Successfully created ${successCount} transaction(s)!`;
          if (failCount > 0) {
            responseMessage += ` ${failCount} transaction(s) failed.`;
          }
        } else {
          responseMessage = `Failed to create all ${failCount} transaction(s). Please check the details and try again.`;
        }
        
        return NextResponse.json({
          success: successCount > 0,
          data: {
            response: responseMessage,
            createdTransactions,
            failedTransactions,
            successCount,
            failCount,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Error confirming multiple transactions:', error);
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to confirm multiple transactions'
        }, { status: 500 });
      }
    }

    let response;
    let transactionCreated = null;
    let multipleTransactionsCreated = null;
    const aiDebug: Record<string, unknown> = {};

    // Unified decision (intent + optional parsed transactions)
    let decision: any;
    let intent: string;
    let aiTime: number;
    
    if (!isTransactionMode) {
      // In general chat mode, skip intent detection entirely - go straight to conversational AI
      console.log('💬 General chat mode - skipping intent detection, going to conversational AI');
      intent = 'general_chat';
      decision = { intent: 'general_chat' };
      aiTime = 0; // No AI time for intent detection
    } else {
      // Use AI decision logic only for transaction mode
      PerformanceMonitor.startTimer('ai-decide-and-parse');
      decision = await GroqAIService.decideAndParse(message, user.id);
      aiTime = PerformanceMonitor.endTimer('ai-decide-and-parse');
      intent = decision.intent;
    }
    console.log('🤖 AI Analysis: Intent=' + intent + ', Transactions=' + (decision.transactions?.length || 0) + ', Message:', message.substring(0, 50) + '...');
    console.log('🔍 API Debug - Detected intent:', intent);
    console.log('🔍 API Debug - isTransactionMode:', isTransactionMode);
    aiDebug.intent = intent;
    aiDebug.transactions = decision.transactions || [];

    // Handle based on detected intent
    if (intent === 'multiple_transaction') {
      console.log('🔍 API Debug - MULTIPLE TRANSACTION INTENT DETECTED, isTransactionMode:', isTransactionMode);
      // ONLY allow transaction creation in Transaction Mode
      if (!isTransactionMode) {
        console.log('🔍 API Debug - Blocking transaction in General Chat mode');
        response = "I can help you analyze your financial data, but I can't record transactions in General Chat mode. Please switch to Transaction Mode to record transactions, or ask me about your financial data instead.";
        
        return NextResponse.json({
          success: true,
          data: {
            response,
            timestamp: new Date().toISOString()
          }
        });
      }
      try {
        // Use AI-supplied transactions if present; fallback to parser
        const parsedMultipleTransactions = decision.transactions && decision.transactions.length > 0
          ? { transactions: decision.transactions, totalTransactions: decision.transactions.length, successCount: decision.transactions.length, failedCount: 0 }
          : await GroqAIService.parseMultipleTransactions(message, user.id);
        
        // If multiple transaction parsing fails or returns no transactions, try single transaction parsing
        if (parsedMultipleTransactions.transactions.length === 0) {
          console.log('Multiple transaction parsing failed, trying single transaction parsing...');
          console.log('Original message:', message);
          console.log('Parsed result:', parsedMultipleTransactions);
          const parsedTransaction = await GroqAIService.parseTransaction(message, user.id);
          
          if (parsedTransaction.confidence >= 0.5 && parsedTransaction.amount > 0) {
            // Process as single transaction
            let walletId: number | undefined;
            if (parsedTransaction.walletName && parsedTransaction.walletType) {
              const wallets = await UserWalletDatabase.getAllWallets(user.id);
              const walletNameLower = parsedTransaction.walletName.toLowerCase();
              
              let matchingWallet = wallets.find(w => w.name.toLowerCase() === walletNameLower);
              if (!matchingWallet) {
                matchingWallet = wallets.find(w => w.name.toLowerCase().includes(walletNameLower));
              }
              if (!matchingWallet) {
                matchingWallet = wallets.find(w => walletNameLower.includes(w.name.toLowerCase()));
              }
              
              walletId = matchingWallet?.id;
            }
            
            if (parsedTransaction.type === 'expense') {
              console.log('🔍 API Debug - REACHED EXPENSE HANDLING SECTION - Transaction Mode Only');
              console.log('🔍 API Debug - About to create pending transaction');
              try {
                // ONLY create pending transactions in Transaction Mode
                console.log('🔍 API Debug - Creating pending expense transaction');
                const pendingTransaction = {
                  type: 'expense' as const,
                  description: parsedTransaction.description,
                  amount: parsedTransaction.amount,
                  category: parsedTransaction.category,
                  walletName: parsedTransaction.walletName,
                  walletId: walletId
                };
                
                response = `I understand you want to record an expense: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} in the ${parsedTransaction.category} category${walletId ? ` using ${parsedTransaction.walletName}` : ''}. Please confirm this transaction.`;
                
                console.log('🔍 API Debug - Returning pending transaction:', { response, pendingTransaction });
                return NextResponse.json({
                  success: true,
                  data: {
                    response,
                    pendingTransaction,
                    timestamp: new Date().toISOString()
                  }
                });
              } catch (expenseError) {
                console.error('Error creating pending expense:', expenseError);
                response = expenseError instanceof Error ? expenseError.message : 'Unknown error';
              }
            } else if (parsedTransaction.type === 'income') {
              console.log('🔍 API Debug - REACHED INCOME HANDLING SECTION - Transaction Mode Only');
              try {
                // ONLY create pending transactions in Transaction Mode
                console.log('🔍 API Debug - Creating pending income transaction');
                const pendingTransaction = {
                  type: 'income' as const,
                  description: parsedTransaction.description,
                  amount: parsedTransaction.amount,
                  source: parsedTransaction.source,
                  walletName: parsedTransaction.walletName,
                  walletId: walletId
                };
                
                response = `I understand you want to record income: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} from ${parsedTransaction.source}${walletId ? ` to ${parsedTransaction.walletName}` : ''}. Please confirm this transaction.`;
                
                return NextResponse.json({
                  success: true,
                  data: {
                    response,
                    pendingTransaction,
                    timestamp: new Date().toISOString()
                  }
                });
              } catch (incomeError) {
                console.error('Error creating pending income:', incomeError);
                response = incomeError instanceof Error ? incomeError.message : 'Unknown error';
              }
            }
            
            return NextResponse.json({
              success: true,
              data: {
                response,
                transactionCreated,
                multipleTransactionsCreated: null,
                timestamp: new Date().toISOString()
              }
            });
          }
        }
        
        if (parsedMultipleTransactions.transactions.length > 0) {
          // In Transaction Mode, return pending transactions for confirmation
          if (isTransactionMode) {
            console.log('🔍 API Debug - Creating pending multiple transactions for confirmation');
            const pendingTransactions = parsedMultipleTransactions.transactions
              .filter((transaction: any) => transaction.confidence >= 0.5 && transaction.amount > 0)
              .map((transaction: any) => {
                let walletId: number | undefined;
                let fromWalletId: number | undefined;
                let toWalletId: number | undefined;
                
                // For regular transactions (expense, income, savings)
                if (transaction.walletName && transaction.walletType) {
                  walletId = findWalletByName(userWallets, transaction.walletName, transaction.walletType);
                }
                
                // For transfer transactions, we need both from and to wallets
                if (transaction.type === 'transfer') {
                  // Try to find from and to wallet names in the transaction
                  if (transaction.fromWalletName) {
                    fromWalletId = findWalletByName(userWallets, transaction.fromWalletName, 'bank');
                  }
                  if (transaction.toWalletName) {
                    toWalletId = findWalletByName(userWallets, transaction.toWalletName, 'bank');
                  }
                  // Fallback: if not specified, use the main walletName for fromWallet
                  if (!fromWalletId && transaction.walletName) {
                    fromWalletId = findWalletByName(userWallets, transaction.walletName, transaction.walletType);
                  }
                }
                
                return {
                  type: transaction.type,
                  description: transaction.description,
                  amount: transaction.amount,
                  category: transaction.category,
                  source: transaction.source,
                  walletName: transaction.walletName,
                  goalName: transaction.goalName,
                  fromWalletName: transaction.fromWalletName || transaction.walletName,
                  toWalletName: transaction.toWalletName,
                  adminFee: transaction.adminFee,
                  walletId: walletId,
                  fromWalletId: fromWalletId,
                  toWalletId: toWalletId
                };
              });
            
            if (pendingTransactions.length > 0) {
              response = `I found ${pendingTransactions.length} transaction(s). Please review and confirm them.`;
              
              return NextResponse.json({
                success: true,
                data: {
                  response,
                  pendingTransactions,
                  supportsMultipleEdit: true, // Flag to indicate editing multiple transactions is now supported
                  timestamp: new Date().toISOString()
                }
              });
            } else {
              response = "I couldn't identify any valid transactions. Please provide more specific details for each transaction.";
            }
          } else {
            // Old behavior for non-transaction mode (shouldn't reach here due to earlier check)
            const createdTransactions = [];
            const failedTransactions = [];
            
            // Process each transaction
            for (const transaction of parsedMultipleTransactions.transactions) {
            if (transaction.confidence >= 0.5 && transaction.amount > 0) {
              try {
                let createdTransaction = null;
                
                // Find wallet if mentioned - use cached wallets
                let walletId: number | undefined;
                if (transaction.walletName && transaction.walletType) {
                  walletId = findWalletByName(userWallets, transaction.walletName, transaction.walletType);
                  
                  // If wallet was mentioned but not found, skip this transaction
                  if (!walletId) {
                    failedTransactions.push({
                      transaction,
                      error: `Wallet "${transaction.walletName}" not found. Please create this wallet first.`
                    });
                    continue; // Skip to next transaction
                  }
                }
                
                if (transaction.type === 'expense') {
                  // Handle expense creation with balance validation
                  try {
                    createdTransaction = await handleExpenseCreation(
                      user.id,
                      transaction.description,
                      transaction.amount,
                      transaction.category!,
                      walletId
                    );
                  } catch (expenseError) {
                    console.error('Error creating expense:', expenseError);
                    // Add to failed transactions with specific error message
                    failedTransactions.push({
                      transaction,
                      error: expenseError instanceof Error ? expenseError.message : 'Unknown error'
                    });
                  }
                } else if (transaction.type === 'income') {
                  createdTransaction = await handleIncomeCreation(
                    user.id,
                    transaction.description,
                    transaction.amount,
                    transaction.source!,
                    walletId
                  );
                } else if (transaction.type === 'savings') {
                  // Handle savings transfer with balance validation
                  try {
                    createdTransaction = await handleSavingsTransfer(
                      user.id,
                      transaction.description,
                      transaction.amount,
                      transaction.goalName,
                      walletId
                    );
                  } catch (savingsError) {
                    console.error('Error creating savings:', savingsError);
                    // Add to failed transactions with specific error message
                    failedTransactions.push({
                      transaction,
                      error: savingsError instanceof Error ? savingsError.message : 'Unknown error'
                    });
                  }
                } else if (transaction.type === 'transfer') {
                  // Handle wallet-to-wallet transfer
                  try {
                    // For transfer transactions, we need to parse the transfer details
                    const transferDetails = await GroqAIService.parseWalletTransfer(message, user.id);
                    console.log('Transfer details parsed:', transferDetails);
                    
                    if (transferDetails.fromWalletId && transferDetails.toWalletId) {
                      // Create the main transfer
                      createdTransaction = await handleWalletTransfer(
                        user.id,
                        transaction.description,
                        transaction.amount,
                        transferDetails.fromWalletId,
                        transferDetails.toWalletId
                      );
                      
                      // Handle admin fee if present
                      const adminFee = transaction.adminFee || 0;
                      if (adminFee > 0) {
                        console.log('Creating admin fee expense:', adminFee);
                        try {
                          await handleExpenseCreation(
                            user.id,
                            `Admin fee for ${transaction.description}`,
                            adminFee,
                            'Family & Others', // Admin fees are miscellaneous expenses
                            transferDetails.fromWalletId // Admin fee is deducted from source wallet
                          );
                          console.log('Admin fee expense created successfully');
                        } catch (adminFeeError) {
                          console.error('Error creating admin fee expense:', adminFeeError);
                          // Don't fail the entire transfer if admin fee creation fails
                        }
                      }
                    } else {
                      throw new Error('Could not determine source and destination wallets for transfer');
                    }
                  } catch (transferError) {
                    console.error('Error creating transfer:', transferError);
                    failedTransactions.push({
                      transaction,
                      error: transferError instanceof Error ? transferError.message : 'Unknown error'
                    });
                  }
                }
                
                if (createdTransaction) {
                  createdTransactions.push({
                    transaction,
                    created: createdTransaction
                  });
                } else {
                  failedTransactions.push(transaction);
                }
              } catch (error) {
                console.error('Error creating transaction:', error);
                failedTransactions.push(transaction);
              }
            } else {
              failedTransactions.push(transaction);
            }
          }
          
          // Generate response based on results
          if (createdTransactions.length > 0) {
            const transactionSummaries = createdTransactions.map(({ transaction }) => {
              const amount = transaction.amount.toLocaleString();
              const adminFee = transaction.adminFee || 0;
              const adminFeeText = adminFee > 0 ? ` (with Rp ${adminFee.toLocaleString()} admin fee)` : '';
              
              if (transaction.type === 'expense') {
                return `${transaction.description} (Rp${amount})`;
              } else if (transaction.type === 'income') {
                return `${transaction.description} (Rp${amount})`;
              } else if (transaction.type === 'savings') {
                return `Transfer to savings: ${transaction.description} (Rp${amount})`;
              } else if (transaction.type === 'transfer') {
                return `Transfer: ${transaction.description} (Rp${amount})${adminFeeText}`;
              }
              return `${transaction.description} (Rp${amount})`;
            });
            
            response = `Great! I've successfully processed ${createdTransactions.length} transaction(s):\n\n${transactionSummaries.join('\n')}\n\nAll transactions have been saved successfully!`;
            
            if (failedTransactions.length > 0) {
              response += `\n\nNote: ${failedTransactions.length} transaction(s) could not be processed due to unclear information.`;
            }
            
            multipleTransactionsCreated = {
              created: createdTransactions,
              failed: failedTransactions,
              total: parsedMultipleTransactions.totalTransactions,
              successCount: createdTransactions.length,
              failedCount: failedTransactions.length
            };
          } else {
            console.log('No valid transactions found in multiple transaction parsing');
            console.log('Failed transactions:', parsedMultipleTransactions.failedCount);
            console.log('Total transactions:', parsedMultipleTransactions.totalTransactions);
            response = `I understood that you mentioned multiple transactions, but I couldn't process any of them clearly. Could you please try again with more specific details? For example: "I bought coffee for 25,000, paid electricity bill 200,000, and got salary 8 million".`;
          }
        } // Close the else block for non-transaction mode
      } else {
        response = `I couldn't identify any clear transactions in your message. Could you please try again with more specific details?`;
      }
    } catch (error) {
        console.error('Error parsing multiple transactions:', error);
        response = "I had trouble understanding your multiple transactions. Could you please try again with a clearer format? For example: 'I bought coffee for 25,000, paid rent 2,000,000, and got salary 8 million'.";
      }
    }
    // Check if this is a single transaction input
    else if (intent === 'transaction') {
      console.log('🔍 API Debug - SINGLE TRANSACTION INTENT DETECTED, isTransactionMode:', isTransactionMode);
      // ONLY allow transaction creation in Transaction Mode
      if (!isTransactionMode) {
        console.log('🔍 API Debug - Blocking single transaction in General Chat mode');
        response = "I can help you analyze your financial data, but I can't record transactions in General Chat mode. Please switch to Transaction Mode to record transactions, or ask me about your financial data instead.";
        
        return NextResponse.json({
          success: true,
          data: {
            response,
            timestamp: new Date().toISOString()
          }
        });
      }
        try {
          console.log('🔍 API Debug - ENTERING SINGLE TRANSACTION PROCESSING');
          // Use AI-supplied transaction if present; fallback to parser
          const parsedTransaction = decision.transactions?.[0] || await GroqAIService.parseTransaction(message, user.id);
          
          console.log('Parsed transaction:', parsedTransaction);
          aiDebug.parsedTransaction = parsedTransaction;
          console.log('Transaction type:', parsedTransaction.type);
          console.log('Has wallet name:', !!parsedTransaction.walletName);
          console.log('Description contains tabungan:', parsedTransaction.description?.toLowerCase().includes('tabungan'));
          console.log('Description contains savings:', parsedTransaction.description?.toLowerCase().includes('savings'));
          
          // Handle based on AI-determined transaction type
          if (parsedTransaction.confidence >= 0.5 && parsedTransaction.amount > 0) {
            
            // Find wallet if mentioned - require exact match or close match
            let walletId: number | undefined;
            if (parsedTransaction.walletName && parsedTransaction.walletType) {
              const walletNameLower = parsedTransaction.walletName.toLowerCase();
              
              console.log('Wallet matching debug:', {
                mentionedWallet: parsedTransaction.walletName,
                mentionedWalletLower: walletNameLower,
                availableWallets: userWallets.map(w => ({ id: w.id, name: w.name, nameLower: w.name.toLowerCase() }))
              });
              
              walletId = findWalletByName(userWallets, parsedTransaction.walletName, parsedTransaction.walletType);
              
              const matchedWallet = userWallets.find(w => w.id === walletId);
              console.log('Wallet matching result:', {
                foundWallet: matchedWallet ? { id: matchedWallet.id, name: matchedWallet.name } : null,
                walletId: walletId
              });
            } else {
              // Fallback: infer wallet from message text even if AI didn't return walletName (use cached wallets)
              const messageLower = message.toLowerCase();
              const aliasMap: Record<string, string[]> = {
                bca: ['bca', 'bank bca'],
                mandiri: ['mandiri', 'bank mandiri'],
                bri: ['bri', 'bank bri'],
                bni: ['bni', 'bank bni'],
                cimb: ['cimb', 'cimb niaga'],
                jago: ['jago', 'bank jago'],
                gopay: ['gopay', 'gojek'],
                dana: ['dana'],
                ovo: ['ovo'],
                shopeepay: ['shopeepay', 'shopee pay'],
                cash: ['cash', 'tunai', 'uang tunai']
              };
              const inferred = userWallets.find(w => {
                const nameLower = w.name.toLowerCase();
                const aliases = aliasMap[nameLower as keyof typeof aliasMap] || [];
                return messageLower.includes(nameLower) || aliases.some(a => messageLower.includes(a));
              });
              if (inferred) {
                walletId = inferred.id;
                console.log('Wallet inferred from message:', { id: inferred.id, name: inferred.name });
              }
            }
            
            // Check if AI detected this as a wallet transfer
            if (parsedTransaction.type === 'transfer' && 
                parsedTransaction.walletName && 
                !parsedTransaction.description.toLowerCase().includes('tabungan') &&
                !parsedTransaction.description.toLowerCase().includes('savings')) {
              
              console.log('AI detected wallet transfer, parsing transfer details...');
              const transferDetails = await GroqAIService.parseWalletTransfer(message, user.id);
              console.log('Transfer details parsed:', transferDetails);
              
              if (transferDetails.fromWalletId && transferDetails.toWalletId) {
                if (isTransactionMode) {
                  // Return pending transaction for confirmation
                  const pendingTransaction = {
                    type: 'transfer' as const,
                    description: parsedTransaction.description,
                    amount: parsedTransaction.amount,
                    fromWalletName: transferDetails.fromWalletName,
                    toWalletName: transferDetails.toWalletName,
                    fromWalletId: transferDetails.fromWalletId,
                    toWalletId: transferDetails.toWalletId,
                    adminFee: parsedTransaction.adminFee || 0
                  };
                  
                  const adminFeeMessage = pendingTransaction.adminFee > 0 ? ` (with Rp ${pendingTransaction.adminFee.toLocaleString()} admin fee)` : '';
                  const response = `I understand you want to transfer Rp ${parsedTransaction.amount.toLocaleString()} from your ${transferDetails.fromWalletName} to your ${transferDetails.toWalletName}${adminFeeMessage}. Please confirm this transaction.`;
                  
                  return NextResponse.json({
                    success: true,
                    data: {
                      response,
                      pendingTransaction,
                      timestamp: new Date().toISOString()
                    }
                  });
                } else {
                  // Create transaction immediately (old behavior)
                  const result = await handleWalletTransfer(user.id, message, parsedTransaction.amount, transferDetails.fromWalletId, transferDetails.toWalletId);
                  
                  // Handle admin fee if present
                  const adminFee = parsedTransaction.adminFee || 0;
                  if (adminFee > 0) {
                    console.log('Creating admin fee expense:', adminFee);
                    try {
                      await handleExpenseCreation(
                        user.id,
                        `Admin fee for ${parsedTransaction.description}`,
                        adminFee,
                        'Bank Charges', // Categorize admin fees under Bank Charges
                        transferDetails.fromWalletId // Admin fee is deducted from source wallet
                      );
                      console.log('Admin fee expense created successfully');
                    } catch (adminFeeError) {
                      console.error('Error creating admin fee expense:', adminFeeError);
                      // Don't fail the entire transfer if admin fee creation fails
                    }
                  }
                  
                  const adminFeeMessage = adminFee > 0 ? ` (with Rp ${adminFee.toLocaleString()} admin fee)` : '';
                  return NextResponse.json({
                    success: true,
                    data: {
                      response: `Perfect! I've transferred Rp ${parsedTransaction.amount.toLocaleString()} from your ${transferDetails.fromWalletName} to your ${transferDetails.toWalletName}${adminFeeMessage}. Your wallet balances have been updated!`,
                      transactionCreated: result,
                      timestamp: new Date().toISOString()
                    }
                  });
                }
              } else {
                console.log('Failed to parse wallet transfer - missing wallet IDs:', transferDetails);
                return NextResponse.json({
                  success: false,
                  data: {
                    response: `I understand you want to transfer money, but I need you to specify both the source and destination wallets clearly. For example: "Transfer 1 juta dari BCA ke GoPay" or "Pindah 500rb dari Mandiri ke Dana".`,
                    timestamp: new Date().toISOString()
                  }
                });
              }
            }
            
            // Check if this is a savings transfer (not wallet transfer)
            if (parsedTransaction.type === 'savings' || 
                (parsedTransaction.description && (
                  parsedTransaction.description.toLowerCase().includes('tabung') ||
                  parsedTransaction.description.toLowerCase().includes('simpan') ||
                  parsedTransaction.description.toLowerCase().includes('nabung') ||
                  parsedTransaction.description.toLowerCase().includes('transfer ke tabungan') ||
                  parsedTransaction.description.toLowerCase().includes('masuk ke tabungan') ||
                  parsedTransaction.description.toLowerCase().includes('savings')
                ))) {
              
              console.log('🔍 API Debug - REACHED SAVINGS HANDLING SECTION - Transaction Mode Only');
              try {
                // ONLY create pending transactions in Transaction Mode
                console.log('🔍 API Debug - Creating pending savings transaction');
                const pendingTransaction = {
                  type: 'savings' as const,
                  description: parsedTransaction.description,
                  amount: parsedTransaction.amount,
                  goalName: parsedTransaction.goalName,
                  walletName: parsedTransaction.walletName,
                  walletId: walletId
                };
                
                response = `I understand you want to transfer to savings: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()}${parsedTransaction.goalName ? ` for ${parsedTransaction.goalName}` : ''}${walletId ? ` from ${parsedTransaction.walletName}` : ''}. Please confirm this transaction.`;
                
                return NextResponse.json({
                  success: true,
                  data: {
                    response,
                    pendingTransaction,
                    timestamp: new Date().toISOString()
                  }
                });
              } catch (savingsError) {
                console.error('Error creating pending savings:', savingsError);
                response = savingsError instanceof Error ? savingsError.message : 'Unknown error';
              }
            }
            
            // Handle expense transactions
            if (parsedTransaction.type === 'expense') {
              console.log('🔍 API Debug - REACHED EXPENSE HANDLING SECTION - Transaction Mode Only');
              console.log('🔍 API Debug - About to create pending transaction');
              try {
                // ONLY create pending transactions in Transaction Mode
                console.log('🔍 API Debug - Creating pending expense transaction');
                const pendingTransaction = {
                  type: 'expense' as const,
                  description: parsedTransaction.description,
                  amount: parsedTransaction.amount,
                  category: parsedTransaction.category,
                  walletName: parsedTransaction.walletName,
                  walletId: walletId
                };
                
                response = `I understand you want to record an expense: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} in the ${parsedTransaction.category} category${walletId ? ` using ${parsedTransaction.walletName}` : ''}. Please confirm this transaction.`;
                
                console.log('🔍 API Debug - Returning pending transaction:', { response, pendingTransaction });
                return NextResponse.json({
                  success: true,
                  data: {
                    response,
                    pendingTransaction,
                    timestamp: new Date().toISOString()
                  }
                });
              } catch (expenseError) {
                console.error('Error creating pending expense:', expenseError);
                response = expenseError instanceof Error ? expenseError.message : 'Unknown error';
              }
            } else if (parsedTransaction.type === 'income') {
              console.log('🔍 API Debug - REACHED INCOME HANDLING SECTION - Transaction Mode Only');
              try {
                // ONLY create pending transactions in Transaction Mode
                console.log('🔍 API Debug - Creating pending income transaction');
                const pendingTransaction = {
                  type: 'income' as const,
                  description: parsedTransaction.description,
                  amount: parsedTransaction.amount,
                  source: parsedTransaction.source,
                  walletName: parsedTransaction.walletName,
                  walletId: walletId
                };
                
                response = `I understand you want to record income: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} from ${parsedTransaction.source}${walletId ? ` to ${parsedTransaction.walletName}` : ''}. Please confirm this transaction.`;
                
                return NextResponse.json({
                  success: true,
                  data: {
                    response,
                    pendingTransaction,
                    timestamp: new Date().toISOString()
                  }
                });
              } catch (incomeError) {
                console.error('Error creating pending income:', incomeError);
                response = incomeError instanceof Error ? incomeError.message : 'Unknown error';
              }
            }
        } else {
          if (parsedTransaction.type === 'expense') {
            response = `I understood that you want to record an expense, but I need more clarity. Please specify the amount, what you purchased, and which wallet to use. For example: "Beli kopi 25rb pakai BCA" or "Bayar listrik 200rb dari Gojek".`;
          } else if (parsedTransaction.type === 'income') {
            response = `I understood that you want to record income, but I need more clarity. Please specify the amount, source, and which wallet to receive it. For example: "Gaji 8 juta ke BCA" or "Bonus 1.5 juta ke Gojek".`;
          } else if (parsedTransaction.type === 'savings') {
            response = `I understood that you want to transfer money to savings, but I need more clarity. Could you please specify the amount and what you're saving for? For example: "Transfer 1 million to laptop savings" or "Move 2 million to emergency fund".`;
          }
        }
      } catch (error) {
        console.error('Error parsing transaction:', error);
        response = "I had trouble understanding your transaction. Please specify the amount, what it's for, and which wallet to use. For example: 'Beli kopi 25rb pakai BCA', 'Bayar listrik 200rb dari Gojek', or 'Gaji 8 juta ke BCA'.";
      }
    }
    // Check if this is a data analysis request
    else if (intent === 'data_analysis') {
      console.log('🔍 API Debug - DATA ANALYSIS INTENT DETECTED');
      
      // Block data analysis in Transaction Mode
      if (isTransactionMode) {
        console.log('🔍 API Debug - Blocking data analysis in Transaction Mode');
        response = "📝 You're in Transaction Mode! This mode is for recording transactions only.\n\n" +
                   "To analyze your data, please switch to General Chat mode using the toggle button.\n\n" +
                   "In Transaction Mode, you can:\n" +
                   "• Record expenses: 'Beli kopi 25rb pakai BCA'\n" +
                   "• Record income: 'Gaji 8 juta ke BCA'\n" +
                   "• Record savings: 'Nabung 1 juta ke tabungan'\n" +
                   "• Record transfers: 'Transfer 500rb dari BCA ke Dana'";
        
        return NextResponse.json({
          success: true,
          data: {
            response,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      try {
        console.log('Data analysis request detected:', message);
        
        // Detect time period from user message
        const timePeriod = GroqAIService.detectTimePeriod(message);
        console.log('Time period detected:', timePeriod);
        
        // Get current date for context
        const currentDate = new Date();
        const currentDateString = currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const currentDateISO = currentDate.toISOString().split('T')[0];
        console.log('Current date context:', { currentDateString, currentDateISO });
        
        // Calculate date filters based on time period
        let dateFilter = null;
        const now = new Date();
        
        if (timePeriod === 'today') {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          dateFilter = { startDate: startOfDay, endDate: now };
        } else if (timePeriod === 'weekly') {
          const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = { startDate: startOfWeek, endDate: now };
        } else if (timePeriod === 'monthly') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = { startDate: startOfMonth, endDate: now };
        }
        
        // Get comprehensive financial data for analysis
        // Note: We fetch recent transactions and filter client-side for now
        PerformanceMonitor.startTimer('fetch-transactions-for-analysis');
        const limit = 100; // Optimized limit for better performance
        const allTransactions = await TransactionDatabase.getUserTransactions(user.id, limit, 0);
        const fetchTransactionsTime = PerformanceMonitor.endTimer('fetch-transactions-for-analysis');
        
        // Filter transactions by type and date in one pass for better performance
        const filterTransactions = (transactions: Array<{type: string, date: Date, amount: number | string, category?: string}>, type: string) => {
          return transactions.filter(transaction => {
            if (transaction.type !== type) return false;
            
            if (dateFilter) {
              const transactionDate = new Date(transaction.date);
              return transactionDate >= dateFilter.startDate && transactionDate <= dateFilter.endDate;
            }
            return true;
          });
        };

        const filteredExpenses = filterTransactions(allTransactions, 'expense');
        const filteredIncome = filterTransactions(allTransactions, 'income');
        const filteredSavings = filterTransactions(allTransactions, 'savings');

        // Compute totals for requested period
        const sum = (arr: Array<{amount: number | string}>) => arr.reduce((s, t) => s + (typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)), 0);
        const totalExpenses = sum(filteredExpenses);
        const totalIncome = sum(filteredIncome);
        const totalSavings = sum(filteredSavings);

        // Wallets with balances and total assets
        const walletsWithBalances = await UserWalletDatabase.getAllWalletsWithBalances(user.id);
        const totalWalletBalance = (walletsWithBalances as unknown as Array<Record<string, unknown>>).reduce((s, w) => {
          const balance = w.balance as number | string | undefined;
          return s + (typeof balance === 'string' ? parseFloat(balance) : (balance || 0));
        }, 0);
        const totalAssets = totalWalletBalance;

        // Budgets for current month with spent
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const budgets = await BudgetDatabase.getAllBudgets(user.id, currentMonth, currentYear);

        // Savings goals progression
        const savingsGoals = await SavingsGoalDatabase.getAllSavingsGoals(user.id);

        // Category breakdown for the period
        const expensesByCategory: Record<string, { total: number, transactions: Array<{amount: number | string, category?: string}> }> = {};
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
            totalAssets,
          },
          expensesByCategory
        };

        console.log('Financial data for analysis:', {
          timePeriod,
          expensesCount: financialData.expenses.length,
          incomeCount: financialData.income.length,
          savingsCount: financialData.savings.length
        });

        // Use optimized financial context instead of full data
        const financialContext = await prepareFinancialContext(user.id);
        
        // Send user question with compact financial data and explicit time context
        response = await GroqAIService.generateChatResponse(
          `User Question: ${message}\n\nCurrent Context:\n${financialContext}\n\nNote: You have access to the current date and time above. Use it when relevant to the user's question.`,
          '',
          conversationHistory
        );
      } catch (error) {
        console.error('Error generating data analysis:', error);
        response = "I'm having trouble analyzing your financial data right now. Please try again.";
      }
    } else {
      console.log('🔍 API Debug - GENERAL CHAT INTENT DETECTED, intent:', intent);
      
      // In Transaction Mode, if we reach here, it means the AI didn't detect a transaction intent
      // But the user is trying to record a transaction, so we should force transaction detection
      if (isTransactionMode) {
        console.log('🔍 API Debug - Transaction Mode active but no transaction intent detected, forcing transaction detection');
        
        // Try to parse as a single transaction
        try {
          const parsedTransaction = await GroqAIService.parseTransaction(message, user.id);
          console.log('🔍 API Debug - Forced transaction parsing result:', parsedTransaction);
          
          if (parsedTransaction.confidence >= 0.5 && parsedTransaction.amount > 0) {
            // Find wallet if mentioned
            let walletId: number | undefined;
            if (parsedTransaction.walletName && parsedTransaction.walletType) {
              const walletNameLower = parsedTransaction.walletName.toLowerCase();
              let matchingWallet = userWallets.find(w => w.name.toLowerCase() === walletNameLower);
              if (!matchingWallet) {
                matchingWallet = userWallets.find(w => w.name.toLowerCase().includes(walletNameLower));
              }
              if (!matchingWallet) {
                matchingWallet = userWallets.find(w => walletNameLower.includes(w.name.toLowerCase()));
              }
              walletId = matchingWallet?.id;
            }
            
            if (parsedTransaction.type === 'expense') {
              console.log('🔍 API Debug - Creating pending expense transaction');
              const pendingTransaction = {
                type: 'expense' as const,
                description: parsedTransaction.description,
                amount: parsedTransaction.amount,
                category: parsedTransaction.category,
                walletName: parsedTransaction.walletName,
                walletId: walletId
              };
              
              response = `I understand you want to record an expense: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} in the ${parsedTransaction.category} category${walletId ? ` using ${parsedTransaction.walletName}` : ''}. Please confirm this transaction.`;
              
              return NextResponse.json({
                success: true,
                data: {
                  response,
                  pendingTransaction,
                  timestamp: new Date().toISOString()
                }
              });
            } else if (parsedTransaction.type === 'income') {
              console.log('🔍 API Debug - Creating pending income transaction');
              const pendingTransaction = {
                type: 'income' as const,
                description: parsedTransaction.description,
                amount: parsedTransaction.amount,
                source: parsedTransaction.source,
                walletName: parsedTransaction.walletName,
                walletId: walletId
              };
              
              response = `I understand you want to record income: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} from ${parsedTransaction.source}${walletId ? ` to ${parsedTransaction.walletName}` : ''}. Please confirm this transaction.`;
              
              return NextResponse.json({
                success: true,
                data: {
                  response,
                  pendingTransaction,
                  timestamp: new Date().toISOString()
                }
              });
            } else if (parsedTransaction.type === 'savings') {
              console.log('🔍 API Debug - Creating pending savings transaction');
              const pendingTransaction = {
                type: 'savings' as const,
                description: parsedTransaction.description,
                amount: parsedTransaction.amount,
                goalName: parsedTransaction.goalName,
                walletName: parsedTransaction.walletName,
                walletId: walletId
              };
              
              response = `I understand you want to transfer to savings: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()}${walletId ? ` from ${parsedTransaction.walletName}` : ''}. Please confirm this transaction.`;
              
              return NextResponse.json({
                success: true,
                data: {
                  response,
                  pendingTransaction,
                  timestamp: new Date().toISOString()
                }
              });
            } else if (parsedTransaction.type === 'transfer') {
              console.log('🔍 API Debug - Creating pending transfer transaction');
              // For transfers, we need to parse the transfer details
              try {
                const transferDetails = await GroqAIService.parseWalletTransfer(message, user.id);
                if (transferDetails.fromWalletId && transferDetails.toWalletId) {
                  const pendingTransaction = {
                    type: 'transfer' as const,
                    description: parsedTransaction.description,
                    amount: parsedTransaction.amount,
                    fromWalletName: transferDetails.fromWalletName,
                    toWalletName: transferDetails.toWalletName,
                    fromWalletId: transferDetails.fromWalletId,
                    toWalletId: transferDetails.toWalletId,
                    adminFee: parsedTransaction.adminFee || 0
                  };
                  
                  const adminFeeMessage = pendingTransaction.adminFee > 0 ? ` (with Rp ${pendingTransaction.adminFee.toLocaleString()} admin fee)` : '';
                  response = `I understand you want to transfer Rp ${parsedTransaction.amount.toLocaleString()} from your ${transferDetails.fromWalletName} to your ${transferDetails.toWalletName}${adminFeeMessage}. Please confirm this transaction.`;
                  
                  return NextResponse.json({
                    success: true,
                    data: {
                      response,
                      pendingTransaction,
                      timestamp: new Date().toISOString()
                    }
                  });
                }
              } catch (transferError) {
                console.error('Error parsing transfer details:', transferError);
              }
            }
          }
        } catch (error) {
          console.error('Error in forced transaction parsing:', error);
        }
        
        // If we still couldn't parse a transaction, give a clear message
        if (isTransactionMode && !response) {
          console.log('🔍 API Debug - Could not parse transaction in Transaction Mode');
          response = "📝 You're in Transaction Mode! I couldn't understand that as a transaction.\n\n" +
                     "Please record a transaction using this format:\n\n" +
                     "**Expenses:**\n" +
                     "• 'Beli kopi 25rb pakai BCA'\n" +
                     "• 'Bayar listrik 200rb dari Dana'\n\n" +
                     "**Income:**\n" +
                     "• 'Gaji 8 juta ke BCA'\n" +
                     "• 'Bonus 1.5 juta ke Mandiri'\n\n" +
                     "**Savings:**\n" +
                     "• 'Nabung 1 juta dari BCA'\n" +
                     "• 'Simpan 500rb untuk liburan'\n\n" +
                     "**Transfers:**\n" +
                     "• 'Transfer 500rb dari BCA ke Dana'\n\n" +
                     "💡 **Tip:** Switch to General Chat mode if you want to ask questions or analyze your data!";
        }
      }
      
      // Block general chat in Transaction Mode
      if (isTransactionMode && !response) {
        console.log('🔍 API Debug - Blocking general chat in Transaction Mode');
        response = "📝 You're in Transaction Mode! This mode is for recording transactions only.\n\n" +
                   "To have a general conversation or analyze your data, please switch to General Chat mode using the toggle button.\n\n" +
                   "In Transaction Mode, you can:\n" +
                   "• Record expenses: 'Beli kopi 25rb pakai BCA'\n" +
                   "• Record income: 'Gaji 8 juta ke BCA'\n" +
                   "• Record savings: 'Nabung 1 juta ke tabungan'\n" +
                   "• Record transfers: 'Transfer 500rb dari BCA ke Dana'";
      } else if (!isTransactionMode && !response) {
        // Generate general chat response using optimized financial context
        const financialContext = await prepareFinancialContext(user.id);
        
        // Send user question with compact financial data and explicit time context
        response = await GroqAIService.generateChatResponse(
          `User Question: ${message}\n\nCurrent Context:\n${financialContext}\n\nNote: You have access to the current date and time above. Use it when relevant to the user's question.`,
          '',
          conversationHistory
        );
      }
    }

    const totalTime = PerformanceMonitor.endTimer('chat-request-total');
    
    // Log performance metrics
    console.log('⏱️ Performance Metrics:');
    console.log('  - Total request time:', totalTime.toFixed(2) + 'ms');
    console.log('  - AI decide & parse:', aiTime.toFixed(2) + 'ms');
    console.log('  - Fetch wallets:', walletsTime.toFixed(2) + 'ms');
    
    return NextResponse.json({
      success: true,
      data: {
        response,
        transactionCreated,
        multipleTransactionsCreated,
        ai: aiDebug,
        timestamp: new Date().toISOString(),
        performance: {
          totalTime: totalTime,
          aiTime: aiTime,
          walletsTime: walletsTime
        }
      }
    });

  } catch (error) {
    console.error('POST /api/chat error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

