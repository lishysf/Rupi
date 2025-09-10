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
  type: 'income' | 'expense' | 'savings' | 'investment';
  description: string;
  amount: number;
  category?: ExpenseCategory;
  source?: IncomeSource;
  goalName?: string;
  assetName?: string;
  confidence: number;
}

// Interface for multiple transactions
export interface ParsedMultipleTransactions {
  transactions: ParsedTransaction[];
  totalTransactions: number;
  successCount: number;
  failedCount: number;
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

Your task is to determine if the input is income, expense, savings, or investment, then parse accordingly. Return ONLY a valid JSON object with this exact structure:

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

For INVESTMENTS:
{
  "type": "investment",
  "description": "cleaned and formatted description",
  "amount": number (extracted amount),
  "assetName": "asset name if mentioned (e.g., stock name, fund name), otherwise null",
  "confidence": number between 0 and 1
}

Rules:
- Detect if input describes receiving money (income), spending money (expense), transferring to savings, or transferring to investments
- Income: money coming into your main account (salary, freelance, etc.)
- Expenses: money spent from your main account (purchases, bills, etc.)
- Savings: transferring money FROM main account TO savings account (emergency fund, goal-based savings)
- Investments: transferring money FROM main account TO investment account (stocks, funds, crypto)
- Think of it like having 3 cards: Main (spending), Savings, and Investment cards
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

Savings Examples (Transfer from main to savings):
Input: "Tabung deposito 2 juta"
Output: {"type": "savings", "description": "Transfer to savings deposit", "amount": 2000000, "goalName": null, "confidence": 0.9}

Input: "Tabung untuk laptop 1 juta"
Output: {"type": "savings", "description": "Transfer to laptop savings", "amount": 1000000, "goalName": "laptop", "confidence": 0.9}

Input: "Emergency fund 3 juta"
Output: {"type": "savings", "description": "Transfer to emergency fund", "amount": 3000000, "goalName": "emergency fund", "confidence": 0.9}

Investment Examples (Transfer from main to investment):
Input: "Invest saham 500rb"
Output: {"type": "investment", "description": "Transfer to stock investment", "amount": 500000, "assetName": null, "confidence": 0.9}

Input: "Beli saham BBCA 1 juta"
Output: {"type": "investment", "description": "Transfer to BBCA stock", "amount": 1000000, "assetName": "BBCA", "confidence": 0.95}

Input: "Invest reksadana 2 juta"
Output: {"type": "investment", "description": "Transfer to mutual fund", "amount": 2000000, "assetName": null, "confidence": 0.9}
`;

// System prompt for parsing multiple transactions
const MULTIPLE_TRANSACTION_PARSING_PROMPT = `
You are an AI assistant that helps parse natural language financial transaction descriptions that contain MULTIPLE transactions into structured data.

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

Your task is to identify and parse ALL transactions mentioned in the input. Look for multiple transactions separated by commas, "terus", "lalu", "kemudian", or other connecting words.

Return ONLY a valid JSON object with this exact structure:

{
  "transactions": [
    {
      "type": "expense|income|savings|investment",
      "description": "cleaned and formatted description",
      "amount": number (extracted amount),
      "category": "exact category name from expense categories" (for expenses only),
      "source": "exact source name from income sources" (for income only),
      "goalName": "goal name if mentioned, otherwise null" (for savings only),
      "assetName": "asset name if mentioned, otherwise null" (for investments only),
      "confidence": number between 0 and 1
    }
  ]
}

Rules:
- Parse EACH transaction separately
- Income: money coming into your main account (salary, freelance, etc.)
- Expenses: money spent from your main account (purchases, bills, etc.)
- Savings: transferring money FROM main account TO savings account
- Investments: transferring money FROM main account TO investment account
- Extract amounts as positive numbers (remove currency symbols)
- Choose the most appropriate category/source from the provided lists
- Clean up descriptions but keep them informative
- If any transaction is unclear, set confidence lower but still include it
- ALWAYS return valid JSON, nothing else

Multiple Transaction Examples:
Input: "hari ini aku beli kopi 50k, makan di warteg 10k, terus dapat gaji 1 juta"
Output: {
  "transactions": [
    {"type": "expense", "description": "Coffee purchase", "amount": 50000, "category": "Food & Groceries", "confidence": 0.9},
    {"type": "expense", "description": "Meal at warteg", "amount": 10000, "category": "Food & Groceries", "confidence": 0.9},
    {"type": "income", "description": "Salary received", "amount": 1000000, "source": "Salary", "confidence": 0.95}
  ]
}

Input: "bayar listrik 200rb, bensin 50rb, terus tabung 500rb"
Output: {
  "transactions": [
    {"type": "expense", "description": "Electricity bill payment", "amount": 200000, "category": "Housing & Utilities", "confidence": 0.95},
    {"type": "expense", "description": "Fuel purchase", "amount": 50000, "category": "Transportation", "confidence": 0.9},
    {"type": "savings", "description": "Transfer to savings", "amount": 500000, "goalName": null, "confidence": 0.9}
  ]
}
`;

export class GroqAIService {
  // Parse multiple transactions from natural language
  static async parseMultipleTransactions(userInput: string): Promise<ParsedMultipleTransactions> {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: MULTIPLE_TRANSACTION_PARSING_PROMPT
          },
          {
            role: "user",
            content: userInput
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1, // Low temperature for consistent parsing
        max_completion_tokens: 1000,
        top_p: 0.9,
        stream: false,
        stop: null
      });

      const response = chatCompletion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response from AI');
      }

      // Parse the JSON response
      const parsedData = JSON.parse(response.trim()) as { transactions: ParsedTransaction[] };
      
      // Validate each transaction
      const validTransactions = parsedData.transactions.filter(transaction => 
        this.isValidParsedTransaction(transaction)
      );

      return {
        transactions: validTransactions,
        totalTransactions: parsedData.transactions.length,
        successCount: validTransactions.length,
        failedCount: parsedData.transactions.length - validTransactions.length
      };

    } catch (error) {
      console.error('Error parsing multiple transactions with Groq AI:', error);
      
      // Fallback: try to parse as single transaction
      try {
        const singleTransaction = await this.parseTransaction(userInput);
        return {
          transactions: [singleTransaction],
          totalTransactions: 1,
          successCount: 1,
          failedCount: 0
        };
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        return {
          transactions: [],
          totalTransactions: 0,
          successCount: 0,
          failedCount: 0
        };
      }
    }
  }

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
    const hasValidType = transaction.type === 'income' || transaction.type === 'expense' || transaction.type === 'savings' || transaction.type === 'investment';
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

    if (transaction.type === 'investment') {
      return (
        transaction.assetName === null || typeof transaction.assetName === 'string'
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

  // Check if input likely contains multiple transactions
  static isMultipleTransactionMessage(message: string): boolean {
    const multipleTransactionIndicators = [
      ',', 'terus', 'lalu', 'kemudian', 'dan', 'plus', 'juga', 'sama',
      'selanjutnya', 'setelah itu', 'abis itu'
    ];
    
    const lowerMessage = message.toLowerCase();
    const hasMultipleIndicators = multipleTransactionIndicators.some(indicator => 
      lowerMessage.includes(indicator)
    );
    
    // Also check if there are multiple amounts mentioned
    const amountPattern = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:rb|ribu|k|juta|jt)?/gi;
    const amountMatches = message.match(amountPattern);
    const hasMultipleAmounts = amountMatches ? amountMatches.length > 1 : false;
    
    return hasMultipleIndicators || hasMultipleAmounts;
  }

  // Detect time period from user message
  static detectTimePeriod(message: string): 'today' | 'weekly' | 'monthly' | 'all' {
    const lowerMessage = message.toLowerCase();
    
    // Today keywords
    const todayKeywords = ['hari ini', 'today', 'sekarang', 'pagi ini', 'siang ini', 'malam ini'];
    if (todayKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'today';
    }
    
    // Weekly keywords
    const weeklyKeywords = ['minggu ini', 'this week', 'seminggu', '7 hari', 'satu minggu', 'pekan ini'];
    if (weeklyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'weekly';
    }
    
    // Monthly keywords
    const monthlyKeywords = ['bulan ini', 'this month', 'sebulan', '30 hari', 'satu bulan'];
    if (monthlyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'monthly';
    }
    
    // Default to all data if no specific time period mentioned
    return 'all';
  }

  // Analyze message intent to determine the best response type
  static async analyzeMessageIntent(message: string): Promise<'transaction' | 'multiple_transaction' | 'data_analysis' | 'general_chat'> {
    try {
      const intentPrompt = `
You are an AI intent classifier for a financial assistant. Analyze the user's message and determine the most appropriate response type.

Response types:
1. "transaction" - User wants to record a single financial transaction (income, expense, savings, investment)
2. "multiple_transaction" - User wants to record multiple transactions in one message
3. "data_analysis" - User is asking questions about their financial data, wants analysis, or wants to see their financial information
4. "general_chat" - General conversation, questions about the app, or unclear intent

Examples:
- "Beli kopi 25rb" → transaction
- "Hari ini aku beli kopi 50k, makan di warteg 10k, terus dapat gaji 1 juta" → multiple_transaction
- "Berapa total pengeluaran bulan ini?" → data_analysis
- "Analisis pengeluaran hari ini" → data_analysis
- "Breakdown minggu ini" → data_analysis
- "Ringkasan bulanan" → data_analysis
- "Bagaimana cara menggunakan aplikasi ini?" → general_chat
- "Tampilkan ringkasan keuangan saya" → data_analysis
- "Gajian 5 juta" → transaction
- "Analisis spending pattern saya" → data_analysis
- "Hello" → general_chat

Return ONLY one of these exact words: transaction, multiple_transaction, data_analysis, general_chat
      `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: intentPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1, // Low temperature for consistent classification
        max_completion_tokens: 10,
        top_p: 0.9,
        stream: false,
        stop: null
      });

      const response = chatCompletion.choices[0]?.message?.content?.trim().toLowerCase();
      
      // Validate response
      if (response === 'transaction' || response === 'multiple_transaction' || 
          response === 'data_analysis' || response === 'general_chat') {
        return response as 'transaction' | 'multiple_transaction' | 'data_analysis' | 'general_chat';
      }
      
      // Fallback to keyword-based detection if AI response is invalid
      return this.fallbackIntentDetection(message);
      
    } catch (error) {
      console.error('Error analyzing message intent:', error);
      // Fallback to keyword-based detection
      return this.fallbackIntentDetection(message);
    }
  }

  // Fallback intent detection using keywords
  private static fallbackIntentDetection(message: string): 'transaction' | 'multiple_transaction' | 'data_analysis' | 'general_chat' {
    const lowerMessage = message.toLowerCase();
    
    // Check for multiple transaction indicators
    const multipleIndicators = [',', 'terus', 'lalu', 'kemudian', 'dan', 'plus', 'juga', 'sama'];
    const hasMultipleIndicators = multipleIndicators.some(indicator => lowerMessage.includes(indicator));
    
    const amountPattern = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:rb|ribu|k|juta|jt)?/gi;
    const amountMatches = message.match(amountPattern);
    const hasMultipleAmounts = amountMatches ? amountMatches.length > 1 : false;
    
    if (hasMultipleIndicators || hasMultipleAmounts) {
      return 'multiple_transaction';
    }
    
    // Check for data analysis keywords
    const analysisKeywords = [
      'berapa', 'how much', 'how many', 'analisis', 'analysis', 'ringkasan', 'summary',
      'laporan', 'report', 'breakdown', 'kategori', 'category', 'pola', 'pattern',
      'trend', 'perbandingan', 'compare', 'bandingkan', 'statistik', 'statistics',
      'bulan ini', 'this month', 'minggu ini', 'this week', 'hari ini', 'today',
      'sebulan', 'seminggu', 'sekarang', 'pagi ini', 'siang ini', 'malam ini',
      'pengeluaran', 'expenses', 'pemasukan', 'income', 'tabungan', 'savings',
      'investasi', 'investment', 'belanja', 'spending', 'budget', 'anggaran',
      'total', 'rata-rata', 'average', 'terbesar', 'largest', 'terkecil', 'smallest',
      'tampilkan', 'show', 'lihat', 'see', 'display', 'cari tahu', 'find out', 'cek', 'check'
    ];
    
    if (analysisKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'data_analysis';
    }
    
    // Check for transaction keywords
    const transactionKeywords = [
      'beli', 'bayar', 'buat', 'spend', 'spent', 'purchase', 'bought', 'buy',
      'gaji', 'salary', 'bonus', 'dapat', 'terima', 'income', 'freelance', 'bisnis',
      'tabung', 'invest', 'saham', 'reksadana', 'deposito', 'saving', 'investment'
    ];
    
    if (transactionKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'transaction';
    }
    
    return 'general_chat';
  }

  // Generate AI response for chat with data analysis capabilities
  static async generateChatResponse(userMessage: string, context?: string, conversationHistory?: string): Promise<string> {
    try {
      const systemPrompt = `
You are a helpful AI financial assistant for the Rupi expense tracking app. 
You help users track their expenses, analyze their financial data, and provide insights.

Your capabilities:
1. Record transactions (income, expenses, savings, investments)
2. Analyze financial data and provide insights
3. Answer questions about spending patterns, budgets, and financial health
4. Provide personalized financial tips and recommendations
5. Support specific category analysis (e.g., "analyze my food spending", "breakdown transportation costs")

Response guidelines:
- Keep responses friendly, helpful, and conversational
- Use clear formatting with bullet points, numbers, or sections when appropriate
- When analyzing data, provide specific amounts and percentages
- Give actionable advice based on the user's financial situation
- Use emojis sparingly but effectively to make responses more engaging
- Format currency as "Rp X,XXX,XXX" for better readability
- Use conversation history context when provided to give more relevant responses
- Support follow-up questions by referencing previous context

Current Date: ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})} (${new Date().toISOString().split('T')[0]})

${context ? `Current financial data context: ${context}` : ''}

Examples of good responses:
- "Here's your spending breakdown for this month: 🍽️ Food & Dining: Rp 2,500,000 (45%) 🚗 Transportation: Rp 1,200,000 (22%) 🏠 Housing: Rp 1,800,000 (33%)"
- "Great job! You've saved Rp 5,000,000 this month, which is 25% of your income. Consider increasing your emergency fund to 6 months of expenses."
- "I notice you spent Rp 800,000 on dining out this week. Try meal planning to reduce this to Rp 400,000 and save Rp 400,000 monthly."
- "Based on your previous question about food spending, here's a detailed breakdown of your Food & Groceries category..."
      `;

      const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        {
          role: "system",
          content: systemPrompt
        }
      ];

      // Add conversation history if provided
      if (conversationHistory) {
        messages.push({
          role: "user",
          content: `Previous conversation context: ${conversationHistory}`
        });
        messages.push({
          role: "assistant",
          content: "I understand the previous context. I'll use this information to provide more relevant responses."
        });
      }

      // Add current user message
      messages.push({
        role: "user",
        content: userMessage
      });

      const chatCompletion = await groq.chat.completions.create({
        messages,
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_completion_tokens: 300,
        top_p: 0.9,
        stream: false,
        stop: null
      });

      return chatCompletion.choices[0]?.message?.content || "I'm here to help with your finances!";

    } catch (error) {
      console.error('Error generating chat response:', error);
      return "I'm having trouble responding right now, but I'm here to help with your finances!";
    }
  }

  // Generate data analysis response
  static async generateDataAnalysisResponse(userMessage: string, financialData: any, conversationHistory?: string, timePeriod?: 'today' | 'weekly' | 'monthly' | 'all'): Promise<string> {
    try {
      console.log('Generating data analysis with data:', financialData);
      
      const systemPrompt = `
You are a financial data analyst AI. You MUST use the EXACT numbers provided in the data.

CRITICAL RULES:
1. Use the pre-calculated totals from the "totals" section - DO NOT recalculate
2. Use the category totals from "expensesByCategory" - DO NOT sum individual transactions
3. Format currency exactly as "Rp X,XXX,XXX" (use commas as thousands separators)
4. For percentages: (category total / total expenses) * 100, rounded to 1 decimal place
5. DO NOT make up numbers or estimate
6. Support specific category analysis when requested
7. Use conversation history context when provided
8. Support time-based analysis (today, weekly, monthly, or all-time)

TIME PERIOD CONTEXT:
Current Date: ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})} (${new Date().toISOString().split('T')[0]})

${timePeriod ? `Current analysis period: ${timePeriod}` : 'Analysis period: All available data'}
- "today": Data from today only (${new Date().toISOString().split('T')[0]})
- "weekly": Data from the past 7 days (from ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]})
- "monthly": Data from the current month (${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')})
- "all": All available data (default)

Data structure provided:
- expenses: Individual transactions
- income: Individual transactions  
- savings: Individual transactions
- investments: Individual transactions
- totals: Pre-calculated totals (USE THESE EXACT NUMBERS)
- expensesByCategory: Category totals (USE THESE EXACT NUMBERS)

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

Example:
If totals.totalExpenses = 120000, format as "Rp 120,000"
If expensesByCategory["Food & Groceries"].total = 50000, format as "Rp 50,000"
If percentage = (50000/120000)*100 = 41.7%, show as "41.7%"

Response format for general analysis:
"📊 **Spending Analysis ${timePeriod ? `(${timePeriod})` : ''}**

**Total Expenses:** Rp [use totals.totalExpenses exactly]
**Top Categories:**
1. [category]: Rp [use expensesByCategory total exactly] ([percentage]% of total)
2. [category]: Rp [use expensesByCategory total exactly] ([percentage]% of total)

**Insights:**
- Your largest expense category is [category] with Rp [amount]
- Total income: Rp [use totals.totalIncome exactly]
- Total savings: Rp [use totals.totalSavings exactly]
${timePeriod && timePeriod !== 'all' ? `- Analysis period: ${timePeriod}` : ''}

**Recommendations:**
- Based on your spending patterns, consider [specific advice]"

Response format for specific category analysis:
"📊 **Analysis: [Category Name] ${timePeriod ? `(${timePeriod})` : ''}**

**Total Spent:** Rp [use exact category total]
**Percentage of Total Expenses:** [percentage]%
**Number of Transactions:** [count]
${timePeriod && timePeriod !== 'all' ? `**Analysis Period:** ${timePeriod}` : ''}

**Recent Transactions:**
- [description]: Rp [amount] ([date])
- [description]: Rp [amount] ([date])

**Insights:**
- [specific insights about this category]
- [comparison to other categories if relevant]
${timePeriod && timePeriod !== 'all' ? `- Analysis based on ${timePeriod} data` : ''}

**Recommendations:**
- [specific advice for this category]"

${conversationHistory ? `Conversation History Context: ${conversationHistory}` : ''}
      `;

      // Prepare data summary for the AI with pre-calculated totals
      const expenses = financialData.expenses || [];
      const income = financialData.income || [];
      const savings = financialData.savings || [];
      const investments = financialData.investments || [];

      console.log('Sample expense data:', expenses.slice(0, 2));
      console.log('Sample income data:', income.slice(0, 2));

      // Calculate totals to help AI with accurate analysis
      // Ensure all amounts are properly converted to numbers
      const totalExpenses = expenses.reduce((sum: number, e: any) => {
        const amount = typeof e.amount === 'string' ? parseFloat(e.amount) : (e.amount || 0);
        return sum + amount;
      }, 0);
      const totalIncome = income.reduce((sum: number, i: any) => {
        const amount = typeof i.amount === 'string' ? parseFloat(i.amount) : (i.amount || 0);
        return sum + amount;
      }, 0);
      const totalSavings = savings.reduce((sum: number, s: any) => {
        const amount = typeof s.amount === 'string' ? parseFloat(s.amount) : (s.amount || 0);
        return sum + amount;
      }, 0);
      const totalInvestments = investments.reduce((sum: number, inv: any) => {
        const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : (inv.amount || 0);
        return sum + amount;
      }, 0);

      // Group expenses by category with totals
      const expensesByCategory: Record<string, { total: number, transactions: any[] }> = {};
      expenses.forEach((expense: any) => {
        const category = expense.category || 'Others';
        if (!expensesByCategory[category]) {
          expensesByCategory[category] = { total: 0, transactions: [] };
        }
        const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount) : (expense.amount || 0);
        expensesByCategory[category].total += amount;
        expensesByCategory[category].transactions.push(expense);
      });

      const dataSummary = {
        expenses: expenses.map((e: any) => ({
          amount: typeof e.amount === 'string' ? parseFloat(e.amount) : (e.amount || 0),
          category: e.category,
          description: e.description,
          date: e.date
        })),
        income: income.map((i: any) => ({
          amount: typeof i.amount === 'string' ? parseFloat(i.amount) : (i.amount || 0),
          source: i.source,
          description: i.description,
          date: i.date
        })),
        savings: savings.map((s: any) => ({
          amount: typeof s.amount === 'string' ? parseFloat(s.amount) : (s.amount || 0),
          goal_name: s.goal_name,
          description: s.description,
          date: s.date
        })),
        investments: investments.map((inv: any) => ({
          amount: typeof inv.amount === 'string' ? parseFloat(inv.amount) : (inv.amount || 0),
          asset_name: inv.asset_name,
          description: inv.description,
          date: inv.date
        })),
        // Pre-calculated totals to help AI
        totals: {
          totalExpenses,
          totalIncome,
          totalSavings,
          totalInvestments
        },
        expensesByCategory
      };

      // Check if there's any data to analyze
      const hasData = dataSummary.expenses.length > 0 || dataSummary.income.length > 0 || 
                     dataSummary.savings.length > 0 || dataSummary.investments.length > 0;

      if (!hasData) {
        return `📊 **No Financial Data Available**

I don't have any financial data to analyze yet. To get started:

**📝 Record Some Transactions:**
• "Beli kopi 25rb" (expense)
• "Gajian 5 juta" (income)  
• "Tabung 1 juta" (savings)
• "Invest saham 500rb" (investment)

**💡 Or Try Multiple at Once:**
• "Hari ini aku beli kopi 25rb, makan siang 50rb, terus dapat gaji 5 juta"

Once you have some transactions recorded, I can provide detailed analysis of your spending patterns, income trends, and financial insights!`;
      }

      const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        {
          role: "system",
          content: systemPrompt
        }
      ];

      // Add conversation history if provided
      if (conversationHistory) {
        messages.push({
          role: "user",
          content: `Previous conversation context: ${conversationHistory}`
        });
        messages.push({
          role: "assistant",
          content: "I understand the previous context. I'll use this information to provide more relevant analysis."
        });
      }

      // Add current user question with financial data
      messages.push({
        role: "user",
        content: `Financial Data: ${JSON.stringify(dataSummary)}\n\nUser Question: ${userMessage}\n\nCRITICAL: Use the EXACT numbers from the "totals" and "expensesByCategory" sections. DO NOT recalculate or estimate. Use the pre-calculated totals provided.`
      });

      const chatCompletion = await groq.chat.completions.create({
        messages,
        model: "llama-3.1-8b-instant",
        temperature: 0.1, // Very low temperature for consistent analysis
        max_completion_tokens: 500,
        top_p: 0.9,
        stream: false,
        stop: null
      });

      return chatCompletion.choices[0]?.message?.content || "I need more data to provide a proper analysis.";

    } catch (error) {
      console.error('Error generating data analysis:', error);
      return "I'm having trouble analyzing your data right now. Please try again.";
    }
  }
}
