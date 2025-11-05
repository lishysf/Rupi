import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TelegramDatabase } from '@/lib/telegram-database';
import { TelegramBotService } from '@/lib/telegram-bot';
import { UserDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token, userId } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Get Telegram user ID from token
    const telegramUserId = await TelegramDatabase.getTelegramUserFromToken(token);

    if (!telegramUserId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Verify the userId matches the session
    if (userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'User ID mismatch' },
        { status: 403 }
      );
    }

    console.log('🔗 Starting Telegram account linking...', { telegramUserId, userId });
    
    // Verify session exists before linking
    const { Pool } = await import('pg');
    let pool: Pool;
    
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 2,
        min: 0,
        idleTimeoutMillis: 5000,
      });
    } else if (process.env.SUPABASE_DB_PASSWORD) {
      const supabaseUrl = process.env.SUPABASE_DB_HOST || 'db.thkdrlozedfysuukvwmd.supabase.co';
      pool = new Pool({
        host: supabaseUrl,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: process.env.SUPABASE_DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        max: 2,
        min: 0,
        idleTimeoutMillis: 5000,
      });
    } else {
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'rupi_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
      });
    }
    
    // Check session before linking
    const beforeCheck = await pool.query(
      'SELECT chat_id, is_authenticated, fundy_user_id FROM telegram_sessions WHERE telegram_user_id = $1',
      [telegramUserId]
    );
    console.log('📊 Session before authentication:', beforeCheck.rows[0] || 'No session found');
    
    // Link Telegram account to user
    await TelegramDatabase.authenticateUser(telegramUserId, parseInt(userId));
    console.log('✅ Account authenticated in database');
    
    // Verify authentication worked
    const afterCheck = await pool.query(
      'SELECT chat_id, is_authenticated, fundy_user_id FROM telegram_sessions WHERE telegram_user_id = $1',
      [telegramUserId]
    );
    console.log('📊 Session after authentication:', afterCheck.rows[0] || 'No session found');

    // Get user info to send welcome message
    const user = await UserDatabase.getUserById(parseInt(userId));
    console.log('📧 User info retrieved:', { userId: user?.id, name: user?.name });
    
    // Use the same pool to get chat_id
    try {
      // Send success message to Telegram if we have a chat_id
      const sessionData = afterCheck.rows[0];
      if (sessionData && sessionData.chat_id) {
        const chatId = sessionData.chat_id;
        console.log('💬 Attempting to send message to Telegram chat_id:', chatId);
        
        try {
          await TelegramBotService.sendMessage(
            chatId,
            `✅ *Login successful!*\n\nWelcome back, ${user?.name || 'User'}!\n\nYou can now chat with me to manage your finances. Try:\n• "Beli kopi 30k pakai Gopay"\n• "Analisis pengeluaran bulan ini"`
          );
          console.log('✅ Successfully sent login notification to Telegram');
        } catch (error: any) {
          console.error('❌ Error sending Telegram notification:', error);
          console.error('Error message:', error?.message);
          console.error('Error stack:', error?.stack);
          // Don't fail the request if notification fails
        }
      } else {
        console.warn('⚠️ No chat_id found for Telegram user:', telegramUserId);
        console.warn('Session data:', sessionData);
        console.warn('This means the session was not created with a chat_id when the user clicked /login');
      }
    } catch (error) {
      console.error('❌ Error getting Telegram session for notification:', error);
      // Continue even if we can't send notification
    } finally {
      await pool.end();
    }

    // Delete the token after use
    await TelegramDatabase.deleteOAuthToken(token);

    return NextResponse.json({
      success: true,
      message: 'Telegram account linked successfully'
    });
  } catch (error) {
    console.error('Error linking Telegram account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to link Telegram account' },
      { status: 500 }
    );
  }
}

