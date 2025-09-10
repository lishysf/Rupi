import { Groq } from 'groq-sdk';
import { EXPENSE_CATEGORIES, ExpenseCategory, INCOME_SOURCES, IncomeSource } from './database';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Interface for parsed expense data
export interface ParsedExpense {
  description: string;
  amount: number;
  category: ExpenseCategory;
  confidence: number;
}

// Interface for parsed income data
export interface ParsedIncome {
  description: string;
  amount: number;
  source: IncomeSource;
  confidence: number;
}

// Interface for parsed transaction data
export interface ParsedTransaction {
  type: 'income' | 'expense' | 'savings';
  description: string;
  amount: number;
  category?: ExpenseCategory;
  source?: IncomeSource;
  goalName?: string;
  confidence: number;
}

// System prompt for transaction parsing (income, expenses, and savings)
const TRANSACTION_PARSING_PROMPT = `
You are an AI assistant that helps parse natural language financial transaction descriptions into structured data.

Available expense categories:
1. Housing & Utilities (rent, electricity, internet, water, mortgage, home maintenance)
2. Food & Groceries (groceries, eating out, snacks, restaurants, food delivery)
3. Transportation (fuel, public transport, taxi, car maintenance, parking)
4. Health & Personal (medical, fitness, self-care, pharmacy, doctor visits)
5. Entertainment & Shopping (leisure, clothes, subscriptions, games, movies, hobbies)
6. Debt Payments (credit card payments, loan payments, debt repayment, mortgage payments)
7. Family & Others (kids, pets, gifts, charity, unexpected expenses, miscellaneous)

Available income sources:
1. Salary (monthly salary, paycheck, wages)
2. Freelance (freelance work, consulting, gig work)
3. Business (business income, sales, revenue)
4. Investment (dividends, interest, capital gains)
5. Bonus (performance bonus, commission, tips)
6. Gift (gifts, allowance, money received)
7. Others (other income sources, miscellaneous income)

Your task is to determine if the input is income, expense, or savings, then parse accordingly. Return ONLY a valid JSON object with this exact structure:

For EXPENSES:
{
  "type": "expense",
  "description": "cleaned and formatted description",
  "amount": number (extracted amount),
  "category": "exact category name from expense categories",
  "confidence": number between 0 and 1
}

For INCOME:
{
  "type": "income",
  "description": "cleaned and formatted description",
  "amount": number (extracted amount),
  "source": "exact source name from income sources",
  "confidence": number between 0 and 1
}

For SAVINGS:
{
  "type": "savings",
  "description": "cleaned and formatted description",
  "amount": number (extracted amount),
  "goalName": "goal name if mentioned, otherwise null",
  "confidence": number between 0 and 1
}

Rules:
- Detect if input describes receiving money (income), spending money (expense), or saving money (savings)
- Savings include: deposits, investments, setting money aside, emergency funds, goal-based savings
- Extract the amount as a positive number (remove currency symbols)
- Choose the most appropriate category/source from the provided lists
- Clean up the description but keep it informative
- If type, amount, or category/source is unclear, set confidence lower
- ALWAYS return valid JSON, nothing else

Income Examples:
Input: "Gajian bulan ini 8 juta"
Output: {"type": "income", "description": "Monthly salary", "amount": 8000000, "source": "Salary", "confidence": 0.95}

Input: "Dapat bonus kinerja 2 juta"
Output: {"type": "income", "description": "Performance bonus", "amount": 2000000, "source": "Bonus", "confidence": 0.9}

Input: "Hasil freelance 1.5 juta"
Output: {"type": "income", "description": "Freelance work payment", "amount": 1500000, "source": "Freelance", "confidence": 0.9}

Expense Examples:
Input: "Aku beli kopi 50.000"
Output: {"type": "expense", "description": "Coffee purchase", "amount": 50000, "category": "Food & Groceries", "confidence": 0.9}

Input: "Bayar listrik bulan ini 200rb"
Output: {"type": "expense", "description": "Monthly electricity bill", "amount": 200000, "category": "Housing & Utilities", "confidence": 0.95}

Input: "Bayar cicilan motor 1.5 juta"
Output: {"type": "expense", "description": "Motorcycle installment payment", "amount": 1500000, "category": "Debt Payments", "confidence": 0.95}

Savings Examples:
Input: "Tabung deposito 2 juta"
Output: {"type": "savings", "description": "Deposit savings", "amount": 2000000, "goalName": null, "confidence": 0.9}

Input: "Invest saham 500rb"
Output: {"type": "savings", "description": "Stock investment", "amount": 500000, "goalName": null, "confidence": 0.9}

Input: "Tabung untuk laptop 1 juta"
Output: {"type": "savings", "description": "Savings for laptop", "amount": 1000000, "goalName": "laptop", "confidence": 0.9}

Input: "Emergency fund 3 juta"
Output: {"type": "savings", "description": "Emergency fund deposit", "amount": 3000000, "goalName": "emergency fund", "confidence": 0.9}
`;

export class GroqAIService {
  // Parse transaction (income, expense, or savings) from natural language
  static async parseTransaction(userInput: string): Promise<ParsedTransaction> {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: TRANSACTION_PARSING_PROMPT
          },
          {
            role: "user",
            content: userInput
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1, // Low temperature for consistent parsing
        max_completion_tokens: 200,
        top_p: 0.9,
        stream: false,
        stop: null
      });

      const response = chatCompletion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response from AI');
      }

      // Parse the JSON response
      const parsedTransaction = JSON.parse(response.trim()) as ParsedTransaction;
      
      // Validate the parsed transaction
      if (!this.isValidParsedTransaction(parsedTransaction)) {
        throw new Error('Invalid transaction format from AI');
      }

      return parsedTransaction;

    } catch (error) {
      console.error('Error parsing transaction with Groq AI:', error);
      
      // Fallback parsing if AI fails
      return this.fallbackParseTransaction(userInput);
    }
  }

  // Legacy method for backward compatibility
  static async parseExpense(userInput: string): Promise<ParsedExpense> {
    const transaction = await this.parseTransaction(userInput);
    if (transaction.type === 'expense') {
      return {
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category!,
        confidence: transaction.confidence
      };
    } else {
      // If detected as income, return as miscellaneous expense with low confidence
      return {
        description: transaction.description,
        amount: transaction.amount,
        category: 'Family & Others',
        confidence: 0.1
      };
    }
  }

  // Validate parsed transaction data
  private static isValidParsedTransaction(transaction: any): transaction is ParsedTransaction {
    const hasValidType = transaction.type === 'income' || transaction.type === 'expense' || transaction.type === 'savings';
    const hasValidBasics = (
      typeof transaction === 'object' &&
      typeof transaction.description === 'string' &&
      typeof transaction.amount === 'number' &&
      typeof transaction.confidence === 'number' &&
      transaction.amount > 0 &&
      transaction.confidence >= 0 && transaction.confidence <= 1
    );

    if (!hasValidType || !hasValidBasics) return false;

    if (transaction.type === 'expense') {
      return (
        typeof transaction.category === 'string' &&
        EXPENSE_CATEGORIES.includes(transaction.category as ExpenseCategory)
      );
    }

    if (transaction.type === 'income') {
      return (
        typeof transaction.source === 'string' &&
        INCOME_SOURCES.includes(transaction.source as IncomeSource)
      );
    }

    if (transaction.type === 'savings') {
      return (
        transaction.goalName === null || typeof transaction.goalName === 'string'
      );
    }

    return false;
  }

  // Validate parsed expense data (legacy)
  private static isValidParsedExpense(expense: any): expense is ParsedExpense {
    return (
      typeof expense === 'object' &&
      typeof expense.description === 'string' &&
      typeof expense.amount === 'number' &&
      typeof expense.category === 'string' &&
      typeof expense.confidence === 'number' &&
      expense.amount > 0 &&
      expense.confidence >= 0 && expense.confidence <= 1 &&
      EXPENSE_CATEGORIES.includes(expense.category as ExpenseCategory)
    );
  }

  // Fallback parsing method for transactions
  private static fallbackParseTransaction(userInput: string): ParsedTransaction {
    // First determine if it's income or expense
    const incomeKeywords = ['gaji', 'salary', 'bonus', 'dapat', 'terima', 'income', 'freelance', 'bisnis', 'dividen', 'hadiah'];
    const lowerInput = userInput.toLowerCase();
    
    const isIncome = incomeKeywords.some(keyword => lowerInput.includes(keyword));
    
    if (isIncome) {
      return this.fallbackParseIncome(userInput);
    } else {
      const expense = this.fallbackParseExpense(userInput);
      return {
        type: 'expense',
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        confidence: expense.confidence
      };
    }
  }

  // Fallback parsing method for income
  private static fallbackParseIncome(userInput: string): ParsedTransaction {
    // Extract amount using regex (supports various formats)
    const amountRegex = /(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:rb|ribu|k|juta|jt)?/i;
    const amountMatch = userInput.match(amountRegex);
    
    let amount = 0;
    if (amountMatch) {
      let amountStr = amountMatch[1].replace(/[.,]/g, '');
      amount = parseInt(amountStr);
      
      // Handle multipliers
      if (userInput.toLowerCase().includes('juta') || userInput.toLowerCase().includes('jt')) {
        amount *= 1000000;
      } else if (userInput.toLowerCase().includes('rb') || userInput.toLowerCase().includes('ribu')) {
        amount *= 1000;
      } else if (userInput.toLowerCase().includes('k')) {
        amount *= 1000;
      }
    }

    // Simple source detection based on keywords
    const sourceKeywords = {
      'Salary': ['gaji', 'salary', 'paycheck', 'wages'],
      'Freelance': ['freelance', 'consulting', 'gig'],
      'Business': ['bisnis', 'business', 'sales', 'revenue'],
      'Investment': ['dividen', 'dividend', 'interest', 'invest'],
      'Bonus': ['bonus', 'commission', 'tips'],
      'Gift': ['hadiah', 'gift', 'allowance', 'dapat', 'terima'],
      'Others': []
    };

    let detectedSource: IncomeSource = 'Others';
    let confidence = 0.3;

    const lowerInput = userInput.toLowerCase();
    for (const [source, keywords] of Object.entries(sourceKeywords)) {
      for (const keyword of keywords) {
        if (lowerInput.includes(keyword)) {
          detectedSource = source as IncomeSource;
          confidence = 0.7;
          break;
        }
      }
      if (confidence > 0.3) break;
    }

    return {
      type: 'income',
      description: userInput.trim(),
      amount: amount || 0,
      source: detectedSource,
      confidence: amount > 0 ? confidence : 0.2
    };
  }

  // Fallback parsing method for expenses (legacy)
  private static fallbackParseExpense(userInput: string): ParsedExpense {
    // Extract amount using regex (supports various formats)
    const amountRegex = /(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:rb|ribu|k)?/i;
    const amountMatch = userInput.match(amountRegex);
    
    let amount = 0;
    if (amountMatch) {
      let amountStr = amountMatch[1].replace(/[.,]/g, '');
      amount = parseInt(amountStr);
      
      // Handle "rb", "ribu", "k" multipliers
      if (userInput.toLowerCase().includes('rb') || userInput.toLowerCase().includes('ribu')) {
        amount *= 1000;
      } else if (userInput.toLowerCase().includes('k')) {
        amount *= 1000;
      }
    }

    // Simple category detection based on keywords
    const categoryKeywords = {
      'Housing & Utilities': ['listrik', 'air', 'internet', 'sewa', 'kontrakan', 'kos', 'wifi', 'pdam'],
      'Food & Groceries': ['makan', 'kopi', 'nasi', 'ayam', 'sate', 'bakso', 'warteg', 'indomaret', 'alfamart', 'supermarket'],
      'Transportation': ['bensin', 'gojek', 'grab', 'ojol', 'bus', 'kereta', 'parkir', 'tol'],
      'Health & Personal': ['dokter', 'obat', 'apotek', 'vitamin', 'gym', 'salon', 'potong rambut'],
      'Entertainment & Shopping': ['baju', 'sepatu', 'film', 'game', 'netflix', 'spotify', 'shopping', 'mall'],
      'Debt Payments': ['bayar hutang', 'cicilan', 'kredit', 'kartu kredit', 'pinjaman', 'loan', 'debt'],
      'Savings & Investments': ['tabung', 'invest', 'saham', 'reksadana', 'deposito', 'saving', 'investment'],
      'Family & Others': ['hadiah', 'anak', 'kucing', 'anjing', 'donasi', 'sedekah']
    };

    let detectedCategory: ExpenseCategory = 'Family & Others';
    let confidence = 0.3;

    const lowerInput = userInput.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerInput.includes(keyword)) {
          detectedCategory = category as ExpenseCategory;
          confidence = 0.7;
          break;
        }
      }
      if (confidence > 0.3) break;
    }

    return {
      description: userInput.trim(),
      amount: amount || 0,
      category: detectedCategory,
      confidence: amount > 0 ? confidence : 0.2
    };
  }

  // Check if input is likely a transaction (income or expense)
  static isTransactionMessage(message: string): boolean {
    const transactionKeywords = [
      // Expense keywords
      'beli', 'bayar', 'buat', 'spend', 'spent', 'purchase', 'bought', 'buy',
      'kopi', 'makan', 'bensin', 'listrik', 'air', 'sewa', 'cicilan',
      // Income keywords  
      'gaji', 'salary', 'bonus', 'dapat', 'terima', 'income', 'freelance', 'bisnis',
      // Amount indicators
      'rp', 'rupiah', '000', 'ribu', 'rb', 'juta', 'jt', 'k'
    ];
    
    const lowerMessage = message.toLowerCase();
    return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Generate AI response for chat
  static async generateChatResponse(userMessage: string, context?: string): Promise<string> {
    try {
      const systemPrompt = `
You are a helpful AI financial assistant for the Rupi expense tracking app. 
You help users track their expenses and provide financial insights.
Keep responses friendly, concise, and helpful.
When users mention expenses, acknowledge them and provide brief financial tips.
${context ? `Context: ${context}` : ''}
      `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_completion_tokens: 150,
        top_p: 0.9,
        stream: false,
        stop: null
      });

      return chatCompletion.choices[0]?.message?.content || "I'm here to help with your expenses!";

    } catch (error) {
      console.error('Error generating chat response:', error);
      return "I'm having trouble responding right now, but I'm here to help with your expenses!";
    }
  }
}
