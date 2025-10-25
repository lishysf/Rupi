import { Pool } from 'pg';

// Use the same pool configuration as the main database
let pool: Pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
} else if (process.env.SUPABASE_DB_PASSWORD) {
  const supabaseUrl = process.env.SUPABASE_DB_HOST || 'db.thkdrlozedfysuukvwmd.supabase.co';
  const supabasePassword = process.env.SUPABASE_DB_PASSWORD;
  
  pool = new Pool({
    host: supabaseUrl,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: supabasePassword,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
} else {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rupi_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

export interface TelegramSession {
  id: number;
  telegram_user_id: string;
  fundy_user_id: number;
  chat_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_authenticated: boolean;
  created_at: Date;
  last_activity: Date;
}

export class TelegramDatabase {
  // Initialize telegram sessions table
  static async initializeTables() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS telegram_sessions (
          id SERIAL PRIMARY KEY,
          telegram_user_id VARCHAR(255) UNIQUE NOT NULL,
          fundy_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          chat_id VARCHAR(255) NOT NULL,
          username VARCHAR(255),
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          is_authenticated BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index for faster lookups
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON telegram_sessions(telegram_user_id);
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_fundy_user_id ON telegram_sessions(fundy_user_id);
      `);

      console.log('✅ Telegram sessions table initialized');
    } catch (error) {
      console.error('Error initializing telegram sessions table:', error);
      throw error;
    }
  }

  // Get or create telegram session
  static async getOrCreateSession(
    telegramUserId: string,
    chatId: string,
    username?: string,
    firstName?: string,
    lastName?: string
  ): Promise<TelegramSession> {
    try {
      // Try to get existing session
      const existingSession = await pool.query(
        'SELECT * FROM telegram_sessions WHERE telegram_user_id = $1',
        [telegramUserId]
      );

      if (existingSession.rows.length > 0) {
        // Update last activity
        await pool.query(
          'UPDATE telegram_sessions SET last_activity = CURRENT_TIMESTAMP, chat_id = $1 WHERE telegram_user_id = $2',
          [chatId, telegramUserId]
        );
        return existingSession.rows[0] as TelegramSession;
      }

      // Create new session
      const result = await pool.query(
        `INSERT INTO telegram_sessions 
        (telegram_user_id, chat_id, username, first_name, last_name, is_authenticated, fundy_user_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *`,
        [telegramUserId, chatId, username, firstName, lastName, false, null]
      );

      return result.rows[0] as TelegramSession;
    } catch (error) {
      console.error('Error getting/creating telegram session:', error);
      throw error;
    }
  }

  // Authenticate telegram user with Fundy credentials
  static async authenticateUser(telegramUserId: string, fundyUserId: number): Promise<void> {
    try {
      await pool.query(
        'UPDATE telegram_sessions SET fundy_user_id = $1, is_authenticated = $2, last_activity = CURRENT_TIMESTAMP WHERE telegram_user_id = $3',
        [fundyUserId, true, telegramUserId]
      );
    } catch (error) {
      console.error('Error authenticating telegram user:', error);
      throw error;
    }
  }

  // Get authenticated session
  static async getAuthenticatedSession(telegramUserId: string): Promise<TelegramSession | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM telegram_sessions WHERE telegram_user_id = $1 AND is_authenticated = $2',
        [telegramUserId, true]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as TelegramSession;
    } catch (error) {
      console.error('Error getting authenticated session:', error);
      throw error;
    }
  }

  // Logout user
  static async logoutUser(telegramUserId: string): Promise<void> {
    try {
      await pool.query(
        'UPDATE telegram_sessions SET fundy_user_id = $1, is_authenticated = $2, last_activity = CURRENT_TIMESTAMP WHERE telegram_user_id = $3',
        [null, false, telegramUserId]
      );
    } catch (error) {
      console.error('Error logging out telegram user:', error);
      throw error;
    }
  }

  // Update last activity
  static async updateActivity(telegramUserId: string): Promise<void> {
    try {
      await pool.query(
        'UPDATE telegram_sessions SET last_activity = CURRENT_TIMESTAMP WHERE telegram_user_id = $1',
        [telegramUserId]
      );
    } catch (error) {
      console.error('Error updating telegram user activity:', error);
      throw error;
    }
  }
}

