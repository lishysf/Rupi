import { NextRequest, NextResponse } from 'next/server';
import { GroqAIService } from '@/lib/groq-ai';
import { ExpenseDatabase, IncomeDatabase, SavingsDatabase, InvestmentDatabase, initializeDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

// Helper function to handle expense creation with balance validation
async function handleExpenseCreation(userId: number, description: string, amount: number, category: string) {
  // Check if main balance is sufficient for expense
  const [allExpenses, allIncome, allSavings] = await Promise.all([
    ExpenseDatabase.getAllExpenses(userId, 100, 0),
    IncomeDatabase.getAllIncome(userId, 100, 0),
    SavingsDatabase.getAllSavings(userId, 100, 0)
  ]);
  
  const totalIncome = allIncome.reduce((sum, income) => sum + (typeof income.amount === 'string' ? parseFloat(income.amount) : income.amount), 0);
  const totalExpenses = allExpenses.reduce((sum, expense) => sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount), 0);
  const totalSavings = allSavings.reduce((sum, saving) => sum + (typeof saving.amount === 'string' ? parseFloat(saving.amount) : saving.amount), 0);
  const mainBalance = totalIncome - totalExpenses - totalSavings;
  
  if (mainBalance < amount) {
    throw new Error(`Insufficient main balance. Current balance: Rp${mainBalance.toLocaleString()}, Required: Rp${amount.toLocaleString()}`);
  }
  
  return await ExpenseDatabase.createExpense(userId, description, amount, category as any, new Date());
}

// Helper function to handle savings transfers with balance validation
async function handleSavingsTransfer(userId: number, description: string, amount: number, goalName?: string) {
  const isTransferToSavings = description.toLowerCase().includes('transfer to') || 
                             description.toLowerCase().includes('tabung') ||
                             description.toLowerCase().includes('simpan');
  
  if (isTransferToSavings) {
    // Transfer TO savings: Check if main balance is sufficient
    const [allExpenses, allIncome, allSavings] = await Promise.all([
      ExpenseDatabase.getAllExpenses(userId, 100, 0),
      IncomeDatabase.getAllIncome(userId, 100, 0),
      SavingsDatabase.getAllSavings(userId, 100, 0)
    ]);
    
    const totalIncome = allIncome.reduce((sum, income) => sum + (typeof income.amount === 'string' ? parseFloat(income.amount) : income.amount), 0);
    const totalExpenses = allExpenses.reduce((sum, expense) => sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount), 0);
    const totalSavings = allSavings.reduce((sum, saving) => sum + (typeof saving.amount === 'string' ? parseFloat(saving.amount) : saving.amount), 0);
    const mainBalance = totalIncome - totalExpenses - totalSavings;
    
    if (mainBalance < amount) {
      throw new Error(`Insufficient main balance. Current balance: Rp${mainBalance.toLocaleString()}, Required: Rp${amount.toLocaleString()}`);
    }
    
    return await SavingsDatabase.createSavings(userId, description, amount, goalName, new Date());
  } else {
    // Transfer FROM savings: Check if savings balance is sufficient
    const allSavings = await SavingsDatabase.getAllSavings(userId, 100, 0);
    const totalSavings = allSavings.reduce((sum, saving) => sum + (typeof saving.amount === 'string' ? parseFloat(saving.amount) : saving.amount), 0);
    
    if (totalSavings < amount) {
      throw new Error(`Insufficient savings balance. Current savings: Rp${totalSavings.toLocaleString()}, Required: Rp${amount.toLocaleString()}`);
    }
    
    return await SavingsDatabase.createSavings(userId, description, -amount, goalName, new Date());
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
                
                if (transaction.type === 'expense') {
                  // Handle expense creation with balance validation
                  try {
                    createdTransaction = await handleExpenseCreation(
                      user.id,
                      transaction.description,
                      transaction.amount,
                      transaction.category!
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
                  createdTransaction = await IncomeDatabase.createIncome(
                    user.id,
                    transaction.description,
                    transaction.amount,
                    transaction.source!,
                    new Date()
                  );
                } else if (transaction.type === 'savings') {
                  // Handle savings transfer with balance validation
                  try {
                    createdTransaction = await handleSavingsTransfer(
                      user.id,
                      transaction.description,
                      transaction.amount,
                      transaction.goalName
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
        // Parse transaction using Groq AI
        const parsedTransaction = await GroqAIService.parseTransaction(message);
        
        // Only create transaction if confidence is high enough and amount is valid
        if (parsedTransaction.confidence >= 0.5 && parsedTransaction.amount > 0) {
          if (parsedTransaction.type === 'expense') {
            // Handle expense creation with balance validation
            try {
              transactionCreated = await handleExpenseCreation(
                user.id,
                parsedTransaction.description,
                parsedTransaction.amount,
                parsedTransaction.category!
              );
              
              response = `Great! I've recorded your expense: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} in the ${parsedTransaction.category} category. Your expense has been saved successfully!`;
            } catch (expenseError) {
              console.error('Error creating expense:', expenseError);
              response = expenseError instanceof Error ? expenseError.message : 'Unknown error';
            }
          } else if (parsedTransaction.type === 'income') {
            transactionCreated = await IncomeDatabase.createIncome(
              user.id,
              parsedTransaction.description,
              parsedTransaction.amount,
              parsedTransaction.source!,
              new Date()
            );

            response = `Excellent! I've recorded your income: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} from ${parsedTransaction.source}. Your income has been saved successfully!`;
          } else if (parsedTransaction.type === 'savings') {
            // Handle savings transfer with balance validation
            try {
              transactionCreated = await handleSavingsTransfer(
                user.id,
                parsedTransaction.description,
                parsedTransaction.amount,
                parsedTransaction.goalName
              );
              
              const isTransferToSavings = parsedTransaction.description.toLowerCase().includes('transfer to') || 
                                         parsedTransaction.description.toLowerCase().includes('tabung') ||
                                         parsedTransaction.description.toLowerCase().includes('simpan');
              
              if (isTransferToSavings) {
                response = `Perfect! I've transferred Rp${parsedTransaction.amount.toLocaleString()} from your main account to your savings account. Your savings balance has been updated!`;
              } else {
                response = `Perfect! I've transferred Rp${parsedTransaction.amount.toLocaleString()} from your savings account to your main account. Your main balance has been updated!`;
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
            response = `I understood that you want to record an expense, but I need more clarity. Could you please specify the amount and what you purchased? For example: "I bought coffee for 25,000" or "Paid electricity bill 200,000".`;
          } else if (parsedTransaction.type === 'income') {
            response = `I understood that you want to record income, but I need more clarity. Could you please specify the amount and source? For example: "Got salary 8 million" or "Freelance payment 1.5 million".`;
          } else if (parsedTransaction.type === 'savings') {
            response = `I understood that you want to transfer money to savings, but I need more clarity. Could you please specify the amount and what you're saving for? For example: "Transfer 1 million to laptop savings" or "Move 2 million to emergency fund".`;
          } else if (parsedTransaction.type === 'investment') {
            response = `I understood that you want to transfer money to investments, but I need more clarity. Could you please specify the amount and what you're investing in? For example: "Transfer 1 million to stock investment" or "Move 2 million to BBCA shares".`;
          }
        }
      } catch (error) {
        console.error('Error parsing transaction:', error);
        response = "I had trouble understanding your transaction. Could you please try again with a clearer format? For example: 'I bought coffee for 25,000', 'Paid rent 2,000,000', or 'Got salary 8 million'.";
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

