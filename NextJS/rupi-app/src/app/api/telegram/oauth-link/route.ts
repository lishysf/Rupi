import { NextRequest, NextResponse } from 'next/server';
import { TelegramDatabase } from '@/lib/telegram-database';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramUserId } = body;

    if (!telegramUserId) {
      return NextResponse.json(
        { success: false, error: 'Telegram user ID is required' },
        { status: 400 }
      );
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store the token with Telegram user ID
    await TelegramDatabase.storeOAuthToken(token, telegramUserId);

    // Create OAuth URL with the token as state parameter
    // Use the provider directly instead of signin page
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/auth/telegram-oauth?token=${token}`;
    const oauthUrl = `${baseUrl}/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;

    return NextResponse.json({
      success: true,
      oauthUrl,
      token
    });
  } catch (error) {
    console.error('Error generating OAuth link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate OAuth link' },
      { status: 500 }
    );
  }
}

