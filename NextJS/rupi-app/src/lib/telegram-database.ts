import { Pool } from 'pg';

// Use the same pool configuration as the main database
let pool: Pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    // Optimize for serverless - more aggressive timeouts
    max: 2, // Allow 2 connections for better reliability
    min: 0, // Don't keep idle connections
    idleTimeoutMillis: 5000, // Close idle connections quickly
    connectionTimeoutMillis: 15000, // Longer connection timeout
    statement_timeout: 10000, // Query timeout
    query_timeout: 10000, // Query timeout
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
    max: 2,
    min: 0,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 15000,
    statement_timeout: 10000,
    query_timeout: 10000,
  });
} else {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rupi_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 2,
    min: 0,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 15000,
    statement_timeout: 10000,
    query_timeout: 10000,
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
  chat_mode?: 'general' | 'transaction'; // Add mode field
  created_at: Date;
  last_activity: Date;
}

export class TelegramDatabase {
  // Warm up database connection for serverless environment (with timeout)
  static async warmUpConnection(): Promise<void> {
    try {
      console.log('🔥 Warming up database connection...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Database warm-up timeout after 2 seconds'));
        }, 2000);
      });
      
      const queryPromise = pool.query('SELECT 1');
      
      await Promise.race([queryPromise, timeoutPromise]);
      console.log('✅ Database connection warmed up successfully');
    } catch (error) {
      console.error('❌ Database warm-up failed:', error);
      console.log('🔄 Will retry with individual operations...');
      // Don't throw - let retry logic handle it in individual operations
    }
  }

  // Check and ensure database connection is healthy
  private static async ensureConnection(): Promise<void> {
    try {
      console.log('🔍 Checking database connection...');
      await pool.query('SELECT 1');
      console.log('✅ Database connection is healthy');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      console.log('🔄 Attempting to reconnect...');
      
      // Force a new connection by ending the current pool
      try {
        await pool.end();
      } catch (endError) {
        console.log('Pool end error (expected):', endError);
      }
      
      // The pool will automatically create new connections on next query
      throw new Error('Database connection lost, will retry with new connection');
    }
  }

  // Retry database operation with exponential backoff and connection health check
  private static async retryOperation<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3, 
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check connection health before each attempt
        if (attempt > 1) {
          await this.ensureConnection();
        }
        
        return await operation();
      } catch (error) {
        console.error(`Database operation attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  // Initialize telegram sessions table
  static async initializeTables() {
    try {
      await this.retryOperation(async () => {
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
            chat_mode VARCHAR(20) DEFAULT 'general',
            auth_state VARCHAR(255),
            auth_email VARCHAR(255),
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

        // Add auth state columns if they don't exist (migration for existing tables)
        await pool.query(`
          ALTER TABLE telegram_sessions 
          ADD COLUMN IF NOT EXISTS auth_state VARCHAR(255);
        `);
        await pool.query(`
          ALTER TABLE telegram_sessions 
          ADD COLUMN IF NOT EXISTS auth_email VARCHAR(255);
        `);

        // Link tokens table for auto-linking via deep link
        await pool.query(`
          CREATE TABLE IF NOT EXISTS telegram_link_tokens (
            token VARCHAR(64) PRIMARY KEY,
            telegram_user_id VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_link_tokens_telegram_user ON telegram_link_tokens(telegram_user_id);
        `);
      });

      console.log('✅ Telegram sessions table initialized');
    } catch (error) {
      console.error('Error initializing telegram sessions table:', error);
      throw error;
    }
  }

  // Create a short-lived, single-use link token for auto-link
  static async createLinkToken(telegramUserId: string, ttlSeconds: number = 600): Promise<string> {
    const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
    const expiresAtQuery = `NOW() + INTERVAL '${ttlSeconds} seconds'`;

    await this.retryOperation(async () => {
      await pool.query(
        `INSERT INTO telegram_link_tokens (token, telegram_user_id, expires_at, used)
         VALUES ($1, $2, ${expiresAtQuery}, FALSE)`,
        [token, telegramUserId]
      );
    });

    return token;
  }

  // Consume a link token and return telegram_user_id if valid
  static async consumeLinkToken(token: string): Promise<string | null> {
    const result = await this.retryOperation(async () => {
      return await pool.query(
        `UPDATE telegram_link_tokens
         SET used = TRUE
         WHERE token = $1
           AND used = FALSE
           AND expires_at > NOW()
         RETURNING telegram_user_id`,
        [token]
      );
    });

    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0].telegram_user_id as string;
  }

  // Generate and save a 6-digit numeric link code
  static async createLinkCode(telegramUserId: string, ttlSeconds: number = 600): Promise<string> {
    const expiresAtQuery = `NOW() + INTERVAL '${ttlSeconds} seconds'`;
    for (let i = 0; i < 5; i++) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      try {
        await this.retryOperation(async () => {
          await pool.query(
            `INSERT INTO telegram_link_tokens (token, telegram_user_id, expires_at, used)
             VALUES ($1, $2, ${expiresAtQuery}, FALSE)`,
            [code, telegramUserId]
          );
        });
        return code;
      } catch (e) {
        // retry on collision
      }
    }
    throw new Error('Failed to generate link code');
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
      console.log('🔗 Getting/creating session with connection health check...');
      return await this.retryOperation(async () => {
        // Try to get existing session
        const existingSession = await pool.query(
          'SELECT * FROM telegram_sessions WHERE telegram_user_id = $1',
          [telegramUserId]
        );

        if (existingSession.rows.length > 0) {
          console.log('📝 Updating existing session for user:', telegramUserId);
          // Update last activity
          await pool.query(
            'UPDATE telegram_sessions SET last_activity = CURRENT_TIMESTAMP, chat_id = $1 WHERE telegram_user_id = $2',
            [chatId, telegramUserId]
          );
          return existingSession.rows[0] as TelegramSession;
        }

        console.log('🆕 Creating new session for user:', telegramUserId);
        // Create new session
        const result = await pool.query(
          `INSERT INTO telegram_sessions 
          (telegram_user_id, chat_id, username, first_name, last_name, is_authenticated, fundy_user_id) 
          VALUES ($1, $2, $3, $4, $5, $6, $7) 
          RETURNING *`,
          [telegramUserId, chatId, username, firstName, lastName, false, null]
        );

        return result.rows[0] as TelegramSession;
      });
    } catch (error) {
      console.error('Error getting/creating telegram session:', error);
      throw error;
    }
  }

  // Authenticate telegram user with Fundy credentials
  static async authenticateUser(telegramUserId: string, fundyUserId: number): Promise<void> {
    try {
      await this.retryOperation(async () => {
        await pool.query(
          'UPDATE telegram_sessions SET fundy_user_id = $1, is_authenticated = $2, last_activity = CURRENT_TIMESTAMP WHERE telegram_user_id = $3',
          [fundyUserId, true, telegramUserId]
        );
      });
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

  // Set authentication state in database
  static async setAuthState(telegramUserId: string, state: string, email?: string): Promise<void> {
    try {
      await this.retryOperation(async () => {
        await pool.query(
          'UPDATE telegram_sessions SET auth_state = $1, auth_email = $2, last_activity = CURRENT_TIMESTAMP WHERE telegram_user_id = $3',
          [state, email, telegramUserId]
        );
      });
    } catch (error) {
      console.error('Error setting auth state:', error);
      throw error;
    }
  }

  // Get authentication state from database
  static async getAuthState(telegramUserId: string): Promise<{ state: string; email?: string } | null> {
    try {
      const result = await this.retryOperation(async () => {
        return await pool.query(
          'SELECT auth_state, auth_email FROM telegram_sessions WHERE telegram_user_id = $1',
          [telegramUserId]
        );
      });

      if (result.rows.length === 0 || !result.rows[0].auth_state) {
        return null;
      }

      return {
        state: result.rows[0].auth_state,
        email: result.rows[0].auth_email
      };
    } catch (error) {
      console.error('Error getting auth state:', error);
      return null;
    }
  }

  // Clear authentication state
  static async clearAuthState(telegramUserId: string): Promise<void> {
    try {
      await this.retryOperation(async () => {
        await pool.query(
          'UPDATE telegram_sessions SET auth_state = NULL, auth_email = NULL WHERE telegram_user_id = $1',
          [telegramUserId]
        );
      });
    } catch (error) {
      console.error('Error clearing auth state:', error);
      throw error;
    }
  }

  // Set chat mode (general or transaction)
  static async setChatMode(telegramUserId: string, mode: 'general' | 'transaction'): Promise<void> {
    try {
      await this.retryOperation(async () => {
        await pool.query(
          'UPDATE telegram_sessions SET chat_mode = $1, last_activity = CURRENT_TIMESTAMP WHERE telegram_user_id = $2',
          [mode, telegramUserId]
        );
      });
    } catch (error) {
      console.error('Error setting chat mode:', error);
      throw error;
    }
  }

  // Get chat mode
  static async getChatMode(telegramUserId: string): Promise<'general' | 'transaction'> {
    try {
      const result = await this.retryOperation(async () => {
        return await pool.query(
          'SELECT chat_mode FROM telegram_sessions WHERE telegram_user_id = $1',
          [telegramUserId]
        );
      });

      if (result.rows.length === 0 || !result.rows[0].chat_mode) {
        return 'general'; // Default to general mode
      }

      return result.rows[0].chat_mode as 'general' | 'transaction';
    } catch (error) {
      console.error('Error getting chat mode:', error);
      return 'general'; // Default to general mode on error
    }
  }
}

