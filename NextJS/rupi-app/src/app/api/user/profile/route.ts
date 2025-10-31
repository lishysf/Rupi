import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const result = await pool.query(
      `SELECT display_name, currency, occupation, financial_goal_target, discovery_source
       FROM user_profiles WHERE user_id = $1`,
      [user.id]
    );

    const profile = result.rows[0] || null;

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('GET /api/user/profile error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 });
  }
}


