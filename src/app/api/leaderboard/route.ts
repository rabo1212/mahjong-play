/**
 * GET /api/leaderboard — 글로벌 랭킹 (공개)
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('mahjong_profiles')
    .select('nickname, total_games, total_wins')
    .gte('total_games', 1)
    .order('total_wins', { ascending: false })
    .order('total_games', { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: '랭킹을 불러올 수 없습니다' }, { status: 500 });
  }

  const leaderboard = (data || []).map((row, i) => ({
    rank: i + 1,
    nickname: row.nickname,
    totalGames: row.total_games,
    totalWins: row.total_wins,
    winRate: row.total_games > 0
      ? Math.round((row.total_wins / row.total_games) * 100)
      : 0,
  }));

  return NextResponse.json({ leaderboard });
}
