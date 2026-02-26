/**
 * GET /api/leaderboard — 글로벌 랭킹 (공개)
 * 승률 기반 정렬, 최소 3판 이상 플레이 필요
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('mahjong_profiles')
    .select('nickname, total_games, total_wins')
    .gte('total_games', 3);

  if (error) {
    return NextResponse.json({ error: '랭킹을 불러올 수 없습니다' }, { status: 500 });
  }

  const leaderboard = (data || [])
    .map(row => ({
      nickname: row.nickname,
      totalGames: row.total_games,
      totalWins: row.total_wins,
      winRate: row.total_games > 0
        ? Math.round((row.total_wins / row.total_games) * 100)
        : 0,
    }))
    .sort((a, b) => {
      // 1순위: 승률 내림차순
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      // 2순위: 승수 내림차순
      if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
      // 3순위: 대국수 내림차순
      return b.totalGames - a.totalGames;
    })
    .slice(0, 50)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  return NextResponse.json({ leaderboard });
}
