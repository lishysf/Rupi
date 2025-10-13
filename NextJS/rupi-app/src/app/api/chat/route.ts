import { NextRequest, NextResponse } from 'next/server';
import { GroqAIService } from '@/lib/groq-ai';
import { ExpenseDatabase, IncomeDatabase, SavingsDatabase, InvestmentDatabase, UserWalletDatabase, initializeDatabase } from '@/lib/database';
import pool from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

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
  const currentBalance = await UserWalletDatabase.calculateWalletBalance(userId, walletId);
  
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
  
  // Create expense record (balance will be calculated from transactions)
  return await ExpenseDatabase.createExpense(userId, description, amount, category as any, new Date(), walletId);
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
  const currentBalance = await UserWalletDatabase.calculateWalletBalance(userId, walletId);
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
  
  // Create income record (balance will be calculated from transactions)
  return await IncomeDatabase.createIncome(userId, description, amount, source as any, new Date(), walletId);
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

  // Create wallet transfer directly using database
  const { TransactionDatabase } = await import('@/lib/database');
  const { Pool } = await import('pg');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rupi_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create wallet transfer record
    const transferQuery = `
      INSERT INTO wallet_transfers (user_id, from_wallet_id, to_wallet_id, to_savings, amount, description, transfer_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const transferResult = await client.query(transferQuery, [
      userId,
      fromWalletId,
      toWalletId,
      false, // to_savings = false for wallet-to-wallet transfer
      amount,
      description.trim() || `Transfer from ${fromWallet.name} to ${toWallet.name}`,
      'wallet_to_wallet'
    ]);

    // Create outgoing transaction for source wallet
    await TransactionDatabase.createTransaction(
      userId,
      `Transfer to ${toWallet.name}${description ? `: ${description}` : ''}`,
      -amount, // Negative amount for outgoing
      'transfer',
      fromWalletId,
      'Transfer', // Transfer category
      undefined,
      undefined,
      undefined,
      new Date()
    );

    // Create incoming transaction for destination wallet
    await TransactionDatabase.createTransaction(
      userId,
      `Transfer from ${fromWallet.name}${description ? `: ${description}` : ''}`,
      amount, // Positive amount for incoming
      'transfer',
      toWalletId,
      'Transfer', // Transfer category
      undefined,
      undefined,
      undefined,
      new Date()
    );

    await client.query('COMMIT');
    return transferResult.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
                             descriptionLower.includes('savings from') ||
                             (descriptionLower.includes('savings') && descriptionLower.includes('from'));
  
  // Check for transfer FROM savings (withdrawal) keywords
  const isTransferFromSavings = descriptionLower.includes('ambil') ||
                               descriptionLower.includes('pakai') ||
                               descriptionLower.includes('tarik dari tabungan') ||
                               descriptionLower.includes('transfer from') ||
                               descriptionLower.includes('keluar dari tabungan') ||
                               descriptionLower.includes('withdraw') ||
                               descriptionLower.includes('from savings') ||
                               descriptionLower.includes('savings to');
  
  // Default to deposit if no clear direction is specified
  // If wallet is specified, it's likely a deposit (money going from wallet to savings)
  const isDeposit = isTransferToSavings || (!isTransferFromSavings && !isTransferToSavings) || (walletId && !isTransferFromSavings);
  
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
    
    const currentBalance = await UserWalletDatabase.calculateWalletBalance(userId, walletId);
    
    if (currentBalance < amount) {
      throw new Error(`Insufficient balance in ${wallet.name} for savings transfer. Current balance: Rp${currentBalance.toLocaleString()}, Required: Rp${amount.toLocaleString()}`);
    }
    
    // Create savings record
    const savings = await SavingsDatabase.createSavings(userId, description, amount, goalName, new Date(), walletId);
    
    // Create wallet transfer record (NOT an expense - just money movement)
    const { WalletTransferDatabase } = await import('@/lib/database');
    await WalletTransferDatabase.createTransfer(
      userId,
      walletId, // from wallet
      undefined, // to wallet (none, going to savings)
      true, // to savings
      amount,
      `Savings: ${description}`,
      'wallet_to_savings'
    );
    
    // Also create a transaction record for the new unified system
    const { TransactionDatabase } = await import('@/lib/database');
    await TransactionDatabase.createTransaction(
      userId,
      `Savings: ${description}`,
      -amount, // Negative amount for outgoing from wallet
      'transfer',
      walletId,
      'Savings Transfer',
      undefined,
      goalName,
      undefined,
      new Date()
    );
    
    return savings;
  } else {
    // Transfer FROM savings: Check if savings balance is sufficient
    const allSavings = await SavingsDatabase.getAllSavings(userId, 100, 0);
    const totalSavings = allSavings.reduce((sum, saving) => sum + (typeof saving.amount === 'string' ? parseFloat(saving.amount) : saving.amount), 0);
    
    if (totalSavings < amount) {
      throw new Error(`Insufficient savings balance. Current savings: Rp${totalSavings.toLocaleString()}, Required: Rp${amount.toLocaleString()}`);
    }
    
    // Create savings withdrawal record
    const savings = await SavingsDatabase.createSavings(userId, description, -amount, goalName, new Date());
    
    // Also create a transaction record for the new unified system
    const { TransactionDatabase } = await import('@/lib/database');
    await TransactionDatabase.createTransaction(
      userId,
      `Savings Withdrawal: ${description}`,
      amount, // Positive amount for incoming to wallet
      'transfer',
      undefined, // No specific wallet for savings withdrawal
      'Savings Withdrawal',
      undefined,
      goalName,
      undefined,
      new Date()
    );
    
    return savings;
  }
}

// Initialize database on first request
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Analyze message intent to determine the best response type
    const intent = await GroqAIService.analyzeMessageIntent(message);
    console.log('Message intent detected:', intent);

    // Handle based on detected intent
    if (intent === 'multiple_transaction') {
      try {
        // Parse multiple transactions using Groq AI
        const parsedMultipleTransactions = await GroqAIService.parseMultipleTransactions(message);
        
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
                  // Replace investment portfolio value using database
                  try {
                    createdTransaction = await InvestmentDatabase.replaceInvestmentPortfolio(
                      user.id,
                      transaction.description,
                      transaction.amount,
                      transaction.assetName,
                      new Date()
                    );
                  } catch (investmentError) {
                    console.error('Error updating investment portfolio:', investmentError);
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
              if (transaction.type === 'expense') {
                return `${transaction.description} (Rp${amount})`;
              } else if (transaction.type === 'income') {
                return `${transaction.description} (Rp${amount})`;
              } else if (transaction.type === 'savings') {
                return `Transfer to savings: ${transaction.description} (Rp${amount})`;
              } else if (transaction.type === 'investment') {
                return `Investment portfolio updated to Rp${amount}`;
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
          // Parse transaction using Groq AI - let AI determine the type
          const parsedTransaction = await GroqAIService.parseTransaction(message);
          
          console.log('Parsed transaction:', parsedTransaction);
          console.log('Transaction type:', parsedTransaction.type);
          console.log('Has wallet name:', !!parsedTransaction.walletName);
          console.log('Description contains tabungan:', parsedTransaction.description?.toLowerCase().includes('tabungan'));
          console.log('Description contains savings:', parsedTransaction.description?.toLowerCase().includes('savings'));
          
          // Handle based on AI-determined transaction type
          if (parsedTransaction.confidence >= 0.5 && parsedTransaction.amount > 0) {
            
            // Check if AI detected this as a wallet transfer (not savings transfer)
            if (parsedTransaction.type === 'transfer' && 
                parsedTransaction.walletName && 
                !parsedTransaction.description.toLowerCase().includes('tabungan') &&
                !parsedTransaction.description.toLowerCase().includes('savings')) {
              
              console.log('AI detected wallet transfer, parsing transfer details...');
              const transferDetails = await GroqAIService.parseWalletTransfer(message, user.id);
              console.log('Transfer details parsed:', transferDetails);
              
              if (transferDetails.fromWalletId && transferDetails.toWalletId) {
                const result = await handleWalletTransfer(user.id, message, parsedTransaction.amount, transferDetails.fromWalletId, transferDetails.toWalletId);
                return NextResponse.json({
                  success: true,
                  message: `Perfect! I've transferred Rp ${parsedTransaction.amount.toLocaleString()} from your ${transferDetails.fromWalletName} to your ${transferDetails.toWalletName}. Your wallet balances have been updated!`,
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
              
              console.log('AI detected savings transfer, processing...');
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
                  response = `Perfect! I've transferred Rp${parsedTransaction.amount.toLocaleString()} from your savings account to your wallet. Your wallet balance has been updated!`;
                }
              } catch (savingsError) {
                console.error('Error creating savings:', savingsError);
                response = savingsError instanceof Error ? savingsError.message : 'Unknown error';
              }
            }
            
            // Handle other transaction types (income, expense, investment)
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
              walletId
            });
            
            // If wallet was mentioned but not found, throw an error
            if (!walletId) {
              throw new Error(`Wallet "${parsedTransaction.walletName}" not found. Please create this wallet first or use an existing wallet.`);
            }
          }

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
                response = `Perfect! I've transferred Rp${parsedTransaction.amount.toLocaleString()} from your savings account to your wallet. Your wallet balance has been updated!`;
              }
            } catch (savingsError) {
              console.error('Error creating savings:', savingsError);
              response = savingsError instanceof Error ? savingsError.message : 'Unknown error';
            }
          } else if (parsedTransaction.type === 'investment') {
            // Replace investment portfolio value using database
            try {
              transactionCreated = await InvestmentDatabase.replaceInvestmentPortfolio(
                user.id,
                parsedTransaction.description,
                parsedTransaction.amount,
                parsedTransaction.assetName,
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
        const [allExpenses, allIncome] = await Promise.all([
          ExpenseDatabase.getAllExpenses(user.id, 100, 0), // Get more data for analysis
          IncomeDatabase.getAllIncome(user.id, 100, 0)
        ]);

        // Get savings data directly from database
        let allSavings: any[] = [];
        try {
          allSavings = await SavingsDatabase.getAllSavings(user.id, 100, 0);
        } catch (savingsError) {
          console.error('Error fetching savings:', savingsError);
        }

        // Get investments data directly from database
        let allInvestments: any[] = [];
        try {
          allInvestments = await InvestmentDatabase.getAllInvestments(user.id, 100, 0);
        } catch (investmentsError) {
          console.error('Error fetching investments:', investmentsError);
        }

        // Filter data based on time period
        let filteredExpenses = allExpenses || [];
        let filteredIncome = allIncome || [];
        let filteredSavings = allSavings || [];
        let filteredInvestments = allInvestments || [];

        if (dateFilter) {
          const filterByDate = (transactions: any[]) => {
            return transactions.filter(transaction => {
              const transactionDate = new Date(transaction.date);
              return transactionDate >= dateFilter.startDate && transactionDate <= dateFilter.endDate;
            });
          };

          filteredExpenses = filterByDate(filteredExpenses);
          filteredIncome = filterByDate(filteredIncome);
          filteredSavings = filterByDate(filteredSavings);
          filteredInvestments = filterByDate(filteredInvestments);
        }

        const financialData = {
          expenses: filteredExpenses,
          income: filteredIncome,
          savings: filteredSavings,
          investments: filteredInvestments
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
      // Generate general chat response
      const [recentExpenses, recentIncome] = await Promise.all([
        ExpenseDatabase.getAllExpenses(3, 0),
        IncomeDatabase.getAllIncome(3, 0)
      ]);
      
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

    return NextResponse.json({
      success: true,
      data: {
        response,
        transactionCreated,
        multipleTransactionsCreated,
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

