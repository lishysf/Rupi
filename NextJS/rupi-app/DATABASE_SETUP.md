# Rupi App - Database & AI Setup Guide

This guide will help you set up PostgreSQL database and Groq AI integration for the Rupi expense tracking app.

## Prerequisites

1. **PostgreSQL** - Install PostgreSQL and pgAdmin4
   - Download: https://www.postgresql.org/download/
   - Create a database named `rupi_db`

2. **Groq API Key** - Get your free API key
   - Sign up at: https://console.groq.com/
   - Get your API key from the dashboard

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rupi_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Groq AI Configuration
GROQ_API_KEY=your_groq_api_key_here

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Run the automated setup script:

```bash
npm run setup-db
```

This will:
- Create the expenses table
- Set up database indexes
- Insert sample data
- Verify the setup

### 4. Start the Application

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Testing the AI Integration

1. Click on the chat input at the bottom of the screen
2. Type expense messages in Indonesian or English:
   - "Aku beli kopi 50.000"
   - "Bayar listrik 200rb"
   - "Bensin motor 75000"
   - "I bought lunch for 45000"

The AI will:
- Parse your message
- Extract amount and category
- Save to PostgreSQL database
- Show confirmation with expense details

## Database Schema

### Expenses Table

```sql
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Expense Categories

1. **Housing & Utilities** - rent, electricity, internet, water
2. **Food & Groceries** - groceries, eating out, snacks
3. **Transportation** - fuel, public transport, maintenance
4. **Health & Personal** - medical, fitness, self-care
5. **Entertainment & Shopping** - leisure, clothes, subscriptions
6. **Debt & Savings** - loan payments, savings, investments
7. **Family & Others** - kids, pets, gifts, charity, unexpected

## API Endpoints

- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense
- `POST /api/chat` - AI chat with expense parsing

## Features

### AI Expense Parsing
- Natural language processing using Groq's Llama 3.1
- Support for Indonesian and English
- Automatic categorization
- Amount extraction with various formats
- Confidence scoring

### Dashboard Components
- **Expense List** - View recent expenses with categories
- **Real-time Updates** - Expenses appear immediately after AI parsing
- **Category Summary** - Spending breakdown by category
- **Interactive Chat** - Conversational expense input

### Database Features
- PostgreSQL for reliable data storage
- Automatic timestamps
- Indexed queries for performance
- CRUD operations via REST API

## Troubleshooting

### Database Connection Issues
1. Verify PostgreSQL is running
2. Check credentials in `.env.local`
3. Ensure database `rupi_db` exists
4. Test connection with pgAdmin4

### Groq AI Issues
1. Verify API key in `.env.local`
2. Check API quota at console.groq.com
3. Ensure internet connection

### Build Issues
1. Clear cache: `rm -rf .next`
2. Reinstall: `rm -rf node_modules && npm install`
3. Check TypeScript errors: `npm run lint`

## Development

The app uses:
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **PostgreSQL** for database
- **Groq SDK** for AI integration
- **React Hooks** for state management

## Production Deployment

1. Set up PostgreSQL database on your hosting platform
2. Configure environment variables on your hosting platform
3. Deploy using Vercel, Netlify, or your preferred platform
4. Ensure database connection works in production

Enjoy tracking your expenses with AI! 🚀
