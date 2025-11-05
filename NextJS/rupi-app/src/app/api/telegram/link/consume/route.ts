import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TelegramDatabase } from '@/lib/telegram-database';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const token = (body?.token || '').toString();
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
    }

    const telegramUserId = await TelegramDatabase.consumeLinkToken(token);
    if (!telegramUserId) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 400 });
    }

    const fundyUserId = parseInt(session.user.id as string, 10);
    if (!Number.isFinite(fundyUserId)) {
      return NextResponse.json({ ok: false, error: 'Invalid user id' }, { status: 400 });
    }

    await TelegramDatabase.authenticateUser(telegramUserId, fundyUserId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Link consume error:', error);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}


