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

    // Link Telegram account to user
    await TelegramDatabase.authenticateUser(telegramUserId, parseInt(userId));

    // Get user info to send welcome message
    const user = await UserDatabase.getUserById(parseInt(userId));
    
    // Get Telegram session to get chat_id - query directly from database
    try {
      // Import pool from telegram-database or query directly
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
      } else {
        pool = new Pool({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'rupi_db',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
        });
      }
      
      const result = await pool.query(
        'SELECT chat_id FROM telegram_sessions WHERE telegram_user_id = $1',
        [telegramUserId]
      );
      
      // Send success message to Telegram if we have a chat_id
      if (result.rows.length > 0 && result.rows[0].chat_id) {
        try {
          await TelegramBotService.sendMessage(
            result.rows[0].chat_id,
            `✅ *Login successful!*\n\nWelcome back, ${user?.name || 'User'}!\n\nYou can now chat with me to manage your finances. Try:\n• "Beli kopi 30k pakai Gopay"\n• "Analisis pengeluaran bulan ini"`
          );
          console.log('✅ Successfully sent login notification to Telegram');
        } catch (error) {
          console.error('Error sending Telegram notification:', error);
          // Don't fail the request if notification fails
        }
      } else {
        console.warn('⚠️ No chat_id found for Telegram user:', telegramUserId);
      }
      
      await pool.end();
    } catch (error) {
      console.error('Error getting Telegram session for notification:', error);
      // Continue even if we can't send notification
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

