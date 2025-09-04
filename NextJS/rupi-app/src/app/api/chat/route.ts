import { NextRequest, NextResponse } from 'next/server';
import { GroqAIService } from '@/lib/groq-ai';
import { ExpenseDatabase, IncomeDatabase, initializeDatabase } from '@/lib/database';

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

    const body = await request.json();
    const { message, action } = body;

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

    // Check if this is a transaction input
    if (action === 'parse_transaction' || GroqAIService.isTransactionMessage(message)) {
      try {
        // Parse transaction using Groq AI
        const parsedTransaction = await GroqAIService.parseTransaction(message);
        
        // Only create transaction if confidence is high enough and amount is valid
        if (parsedTransaction.confidence >= 0.5 && parsedTransaction.amount > 0) {
          if (parsedTransaction.type === 'expense') {
            transactionCreated = await ExpenseDatabase.createExpense(
              parsedTransaction.description,
              parsedTransaction.amount,
              parsedTransaction.category!,
              new Date()
            );

            response = `Great! I've recorded your expense: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} in the ${parsedTransaction.category} category. Your expense has been saved successfully!`;
          } else {
            transactionCreated = await IncomeDatabase.createIncome(
              parsedTransaction.description,
              parsedTransaction.amount,
              parsedTransaction.source!,
              new Date()
            );

            response = `Excellent! I've recorded your income: ${parsedTransaction.description} for Rp${parsedTransaction.amount.toLocaleString()} from ${parsedTransaction.source}. Your income has been saved successfully!`;
          }
        } else {
          if (parsedTransaction.type === 'expense') {
            response = `I understood that you want to record an expense, but I need more clarity. Could you please specify the amount and what you purchased? For example: "I bought coffee for 25,000" or "Paid electricity bill 200,000".`;
          } else {
            response = `I understood that you want to record income, but I need more clarity. Could you please specify the amount and source? For example: "Got salary 8 million" or "Freelance payment 1.5 million".`;
          }
        }
      } catch (error) {
        console.error('Error parsing transaction:', error);
        response = "I had trouble understanding your transaction. Could you please try again with a clearer format? For example: 'I bought coffee for 25,000', 'Paid rent 2,000,000', or 'Got salary 8 million'.";
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
      response = await GroqAIService.generateChatResponse(message, context);
    }

    return NextResponse.json({
      success: true,
      data: {
        response,
        transactionCreated,
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

