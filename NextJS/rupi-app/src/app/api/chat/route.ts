import { NextRequest, NextResponse } from 'next/server';
import { GroqAIService } from '@/lib/groq-ai';
import { TransactionDatabase, UserWalletDatabase, BudgetDatabase, SavingsGoalDatabase, initializeDatabase } from '@/lib/database';
import pool from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';
import { PerformanceMonitor } from '@/lib/performance-monitor';
import { createDatabaseIndexes } from '@/lib/database-indexes';

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

// Initialize database on first request
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    // Create database indexes for performance
    try {
      await createDatabaseIndexes();
    } catch (error) {
      console.warn('Database indexes creation failed (non-critical):', error);
    }
    dbInitialized = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    PerformanceMonitor.startTimer('chat-request-total');
    
    await ensureDbInitialized();
    const user = await requireAuth(request);

    const body = await request.json();
    const { message, action, conversationHistory } = body;

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message is required'
        },
        { status: 400 }
      );
    }

    let response;
    let transactionCreated = null;
    let multipleTransactionsCreated = null;
    const aiDebug: Record<string, unknown> = {};

    // Unified decision (intent + optional parsed transactions)
    PerformanceMonitor.startTimer('intent-analysis');
    const decision = await GroqAIService.decideAndParse(message, user.id);
    PerformanceMonitor.endTimer('intent-analysis');
    const intent = decision.intent;
    console.log('Message intent detected:', intent, 'for message:', message.substring(0, 50) + '...');
    aiDebug.intent = intent;
    aiDebug.transactions = decision.transactions || [];

    // Handle based on detected intent
    if (intent === 'multiple_transaction') {
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
              try {
                transactionCreated = await handleExpenseCreation(
                  user.id,
                  parsedTransaction.description,
                  parsedTransaction.amount,
                  parsedTransaction.category!,
                  walletId
                );
                
                const walletInfo = walletId ? ` using ${parsedTransaction.walletName}` : '';
                response = `Great! I've recorded your expense: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} in the ${parsedTransaction.category} category${walletInfo}. Your expense has been saved successfully!`;
              } catch (expenseError) {
                console.error('Error creating expense:', expenseError);
                response = expenseError instanceof Error ? expenseError.message : 'Unknown error';
              }
            } else if (parsedTransaction.type === 'income') {
              transactionCreated = await handleIncomeCreation(
                user.id,
                parsedTransaction.description,
                parsedTransaction.amount,
                parsedTransaction.source!,
                walletId
              );

              const walletInfo = walletId ? ` to ${parsedTransaction.walletName}` : '';
              response = `Excellent! I've recorded your income: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} from ${parsedTransaction.source}${walletInfo}. Your income has been saved successfully!`;
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
          const createdTransactions = [];
          const failedTransactions = [];
          
          // Process each transaction
          for (const transaction of parsedMultipleTransactions.transactions) {
            if (transaction.confidence >= 0.5 && transaction.amount > 0) {
              try {
                let createdTransaction = null;
                
                // Find wallet if mentioned - require exact match or close match
                let walletId: number | undefined;
                if (transaction.walletName && transaction.walletType) {
                  const wallets = await UserWalletDatabase.getAllWallets(user.id);
                  const walletNameLower = transaction.walletName.toLowerCase();
                  
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
                  
                  walletId = matchingWallet?.id;
                  
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
                } else if (transaction.type === 'investment') {
                  // Create investment transaction using unified system
                  try {
                    createdTransaction = await TransactionDatabase.createTransaction(
                      user.id,
                      transaction.description,
                      transaction.amount,
                      'investment',
                      undefined, // No wallet for investments
                      undefined,
                      undefined,
                      undefined,
                      transaction.assetName,
                      undefined,
                      new Date()
                    );
                  } catch (investmentError) {
                    console.error('Error updating investment portfolio:', investmentError);
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
              } else if (transaction.type === 'investment') {
                return `Investment portfolio updated to Rp${amount}`;
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
        try {
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
              const wallets = await UserWalletDatabase.getAllWallets(user.id);
              const walletNameLower = parsedTransaction.walletName.toLowerCase();
              
              console.log('Wallet matching debug:', {
                mentionedWallet: parsedTransaction.walletName,
                mentionedWalletLower: walletNameLower,
                availableWallets: wallets.map(w => ({ id: w.id, name: w.name, nameLower: w.name.toLowerCase() }))
              });
              
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
              
              walletId = matchingWallet?.id;
              
              console.log('Wallet matching result:', {
                foundWallet: matchingWallet ? { id: matchingWallet.id, name: matchingWallet.name } : null,
                walletId: walletId
              });
            } else {
              // Fallback: infer wallet from message text even if AI didn't return walletName
              const wallets = await UserWalletDatabase.getAllWallets(user.id);
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
              const inferred = wallets.find(w => {
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
                  message: `Perfect! I've transferred Rp ${parsedTransaction.amount.toLocaleString()} from your ${transferDetails.fromWalletName} to your ${transferDetails.toWalletName}${adminFeeMessage}. Your wallet balances have been updated!`,
                  data: result
                });
              } else {
                console.log('Failed to parse wallet transfer - missing wallet IDs:', transferDetails);
                return NextResponse.json({
                  success: false,
                  message: `I understand you want to transfer money, but I need you to specify both the source and destination wallets clearly. For example: "Transfer 1 juta dari BCA ke GoPay" or "Pindah 500rb dari Mandiri ke Dana".`
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
              
              // Savings transactions are already handled in the main transaction processing flow above
              // No need for duplicate handling here
              console.log('Savings transaction already processed in main flow');
            }
            
            // Handle other transaction types (income, expense, investment)

          if (parsedTransaction.type === 'expense') {
            // Handle expense creation with balance validation
            try {
              transactionCreated = await handleExpenseCreation(
                user.id,
                parsedTransaction.description,
                parsedTransaction.amount,
                parsedTransaction.category!,
                walletId
              );
              
              const walletInfo = walletId ? ` using ${parsedTransaction.walletName}` : '';
              response = `Great! I've recorded your expense: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} in the ${parsedTransaction.category} category${walletInfo}. Your expense has been saved successfully!`;
            } catch (expenseError) {
              console.error('Error creating expense:', expenseError);
              response = expenseError instanceof Error ? expenseError.message : 'Unknown error';
            }
          } else if (parsedTransaction.type === 'income') {
            transactionCreated = await handleIncomeCreation(
              user.id,
              parsedTransaction.description,
              parsedTransaction.amount,
              parsedTransaction.source!,
              walletId
            );

            const walletInfo = walletId ? ` to ${parsedTransaction.walletName}` : '';
            response = `Excellent! I've recorded your income: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} from ${parsedTransaction.source}${walletInfo}. Your income has been saved successfully!`;
          } else if (parsedTransaction.type === 'savings') {
            // Handle savings transfer with balance validation
            try {
              console.log('AI parsed savings transaction:', {
                originalMessage: message,
                parsedDescription: parsedTransaction.description,
                parsedAmount: parsedTransaction.amount,
                parsedGoalName: parsedTransaction.goalName,
                walletId: walletId
              });
              
              transactionCreated = await handleSavingsTransfer(
                user.id,
                parsedTransaction.description,
                parsedTransaction.amount,
                parsedTransaction.goalName,
                walletId
              );
              
              const descriptionLower = parsedTransaction.description.toLowerCase();
              const isTransferToSavings = descriptionLower.includes('transfer to') || 
                                         descriptionLower.includes('tabung') ||
                                         descriptionLower.includes('simpan') ||
                                         descriptionLower.includes('nabung') ||
                                         descriptionLower.includes('transfer ke tabungan') ||
                                         descriptionLower.includes('masuk ke tabungan');
              
              if (isTransferToSavings) {
                response = `Perfect! I've transferred Rp${parsedTransaction.amount.toLocaleString()} from your wallet to your savings account. Your savings balance has been updated!`;
              } else {
                // Check if a specific wallet was mentioned for the withdrawal
                const walletName = parsedTransaction.walletName || 'wallet';
                response = `Perfect! I've withdrawn Rp${parsedTransaction.amount.toLocaleString()} from your savings and added it to your ${walletName}. Your savings and wallet balances have been updated!`;
              }
            } catch (savingsError) {
              console.error('Error creating savings:', savingsError);
              response = savingsError instanceof Error ? savingsError.message : 'Unknown error';
            }
          } else if (parsedTransaction.type === 'investment') {
            // Create investment transaction using unified system
            try {
              transactionCreated = await TransactionDatabase.createTransaction(
                user.id,
                parsedTransaction.description,
                parsedTransaction.amount,
                'investment',
                undefined, // No wallet for investments
                undefined,
                undefined,
                undefined,
                parsedTransaction.assetName,
                undefined,
                new Date()
              );
              response = `Your investment portfolio value has been updated to Rp${parsedTransaction.amount.toLocaleString()}!`;
            } catch (investmentError) {
              console.error('Error updating investment portfolio:', investmentError);
              response = `I understood that you want to update your investment portfolio, but there was an error saving it. Please try again.`;
            }
          }
        } else {
          if (parsedTransaction.type === 'expense') {
            response = `I understood that you want to record an expense, but I need more clarity. Please specify the amount, what you purchased, and which wallet to use. For example: "Beli kopi 25rb pakai BCA" or "Bayar listrik 200rb dari Gojek".`;
          } else if (parsedTransaction.type === 'income') {
            response = `I understood that you want to record income, but I need more clarity. Please specify the amount, source, and which wallet to receive it. For example: "Gaji 8 juta ke BCA" or "Bonus 1.5 juta ke Gojek".`;
          } else if (parsedTransaction.type === 'savings') {
            response = `I understood that you want to transfer money to savings, but I need more clarity. Could you please specify the amount and what you're saving for? For example: "Transfer 1 million to laptop savings" or "Move 2 million to emergency fund".`;
          } else if (parsedTransaction.type === 'investment') {
            response = `I understood that you want to transfer money to investments, but I need more clarity. Could you please specify the amount and what you're investing in? For example: "Transfer 1 million to stock investment" or "Move 2 million to BBCA shares".`;
          }
        }
      } catch (error) {
        console.error('Error parsing transaction:', error);
        response = "I had trouble understanding your transaction. Please specify the amount, what it's for, and which wallet to use. For example: 'Beli kopi 25rb pakai BCA', 'Bayar listrik 200rb dari Gojek', or 'Gaji 8 juta ke BCA'.";
      }
    }
    // Check if this is a data analysis request
    else if (intent === 'data_analysis') {
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
        const limit = 200; // Slightly higher to cover monthly scope comfortably
        const allTransactions = await TransactionDatabase.getUserTransactions(user.id, limit, 0);
        
        // Filter transactions by type and date in one pass for better performance
        const filterTransactions = (transactions: any[], type: string) => {
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
        const filteredInvestments = filterTransactions(allTransactions, 'investment');

        // Compute totals for requested period
        const sum = (arr: any[]) => arr.reduce((s, t) => s + (typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)), 0);
        const totalExpenses = sum(filteredExpenses);
        const totalIncome = sum(filteredIncome);
        const totalSavings = sum(filteredSavings);
        // Investment: use latest value if available, else sum
        const latestInvestment = filteredInvestments
          .slice()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const totalInvestments = latestInvestment
          ? (typeof latestInvestment.amount === 'string' ? parseFloat(latestInvestment.amount) : latestInvestment.amount || 0)
          : sum(filteredInvestments);

        // Wallets with balances and total assets
        const walletsWithBalances = await UserWalletDatabase.getAllWalletsWithBalances(user.id);
        const totalWalletBalance = walletsWithBalances.reduce((s: number, w: any) => s + (typeof w.balance === 'string' ? parseFloat(w.balance) : (w.balance || 0)), 0);
        const totalAssets = totalWalletBalance + (totalInvestments || 0);

        // Budgets for current month with spent
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const budgets = await BudgetDatabase.getAllBudgets(user.id, currentMonth, currentYear);

        // Savings goals progression
        const savingsGoals = await SavingsGoalDatabase.getAllSavingsGoals(user.id);

        // Category breakdown for the period
        const expensesByCategory: Record<string, { total: number, transactions: any[] }> = {};
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
          investments: filteredInvestments,
          wallets: walletsWithBalances,
          budgets,
          savingsGoals,
          totals: {
            totalExpenses,
            totalIncome,
            totalSavings,
            totalInvestments,
            totalAssets,
          },
          expensesByCategory
        };

        console.log('Financial data for analysis:', {
          timePeriod,
          expensesCount: financialData.expenses.length,
          incomeCount: financialData.income.length,
          savingsCount: financialData.savings.length,
          investmentsCount: financialData.investments.length
        });

        // Add current date context to the message for AI
        const messageWithDateContext = `${message}\n\nCurrent Date: ${currentDateString} (${currentDateISO})`;
        response = await GroqAIService.generateDataAnalysisResponse(messageWithDateContext, financialData, conversationHistory, timePeriod);
      } catch (error) {
        console.error('Error generating data analysis:', error);
        response = "I'm having trouble analyzing your financial data right now. Please try again.";
      }
    } else {
      // Generate general chat response using optimized system
      // Use smaller limit for faster response
      const allTransactions = await TransactionDatabase.getUserTransactions(user.id, 20, 0);
      const recentExpenses = allTransactions.filter(t => t.type === 'expense').slice(0, 2);
      const recentIncome = allTransactions.filter(t => t.type === 'income').slice(0, 2);
      
      const expenseContext = recentExpenses.length > 0 
        ? `Recent expenses: ${recentExpenses.map(e => `${e.description} (Rp${e.amount.toLocaleString()})`).join(', ')}`
        : 'No recent expenses';
      
      const incomeContext = recentIncome.length > 0
        ? `Recent income: ${recentIncome.map(i => `${i.description} (Rp${i.amount.toLocaleString()})`).join(', ')}`
        : 'No recent income';
        
      const context = `${expenseContext}. ${incomeContext}`;
      // Add current date context to general chat
      const currentDate = new Date();
      const currentDateString = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const messageWithDateContext = `${message}\n\nCurrent Date: ${currentDateString}`;
      response = await GroqAIService.generateChatResponse(messageWithDateContext, context, conversationHistory);
    }

    PerformanceMonitor.endTimer('chat-request-total');
    
    return NextResponse.json({
      success: true,
      data: {
        response,
        transactionCreated,
        multipleTransactionsCreated,
        ai: aiDebug,
        timestamp: new Date().toISOString()
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

