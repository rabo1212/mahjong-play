/**
 * GET /api/profile/stats — 내 종합 통계 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface HistoryPlayer {
  playerId: string;
}

interface HistoryResult {
  totalPoints: number;
  yakuList: { nameKo: string; points: number }[];
  isDraw: boolean;
}

interface HistoryRow {
  winner_id: string | null;
  players: HistoryPlayer[];
  result: HistoryResult;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const supabase = createAuthenticatedClient(authHeader);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  // 프로필에서 기본 카운터 조회 (RLS: 본인만)
  const { data: profile } = await supabase
    .from('mahjong_profiles')
    .select('total_games, total_wins')
    .eq('id', user.id)
    .single();

  if (!profile || profile.total_games === 0) {
    return NextResponse.json({ stats: null });
  }

  // 게임 기록에서 상세 통계 계산
  const { data: rows } = await supabaseAdmin
    .from('mahjong_game_history')
    .select('winner_id, players, result')
    .order('played_at', { ascending: false })
    .limit(100);

  const myGames = ((rows as HistoryRow[]) || []).filter(
    row => Array.isArray(row.players) && row.players.some(p => p.playerId === user.id)
  );

  const myWins = myGames.filter(g => g.winner_id === user.id && !g.result?.isDraw);

  // 승리 시 평균 점수
  const avgPointsPerWin = myWins.length > 0
    ? Math.round(myWins.reduce((sum, g) => sum + (g.result?.totalPoints || 0), 0) / myWins.length)
    : 0;

  // 최고 점수
  const bestScore = myWins.length > 0
    ? Math.max(...myWins.map(g => g.result?.totalPoints || 0))
    : 0;

  // 자주 나온 역 TOP 3
  const yakuCounts = new Map<string, number>();
  for (const game of myWins) {
    for (const yaku of (game.result?.yakuList || [])) {
      yakuCounts.set(yaku.nameKo, (yakuCounts.get(yaku.nameKo) || 0) + 1);
    }
  }
  const topYaku = Array.from(yakuCounts.entries())
    .map(([nameKo, count]) => ({ nameKo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 연속 승/패
  let streakType: 'win' | 'lose' = 'lose';
  let streakCount = 0;
  for (const game of myGames) {
    if (game.result?.isDraw) continue;
    const isWin = game.winner_id === user.id;
    const thisType = isWin ? 'win' : 'lose';
    if (streakCount === 0) {
      streakType = thisType;
      streakCount = 1;
    } else if (thisType === streakType) {
      streakCount++;
    } else {
      break;
    }
  }

  const winRate = Math.round((profile.total_wins / profile.total_games) * 100);

  return NextResponse.json({
    stats: {
      totalGames: profile.total_games,
      totalWins: profile.total_wins,
      winRate,
      avgPointsPerWin,
      bestScore,
      topYaku,
      currentStreak: { type: streakType, count: streakCount },
    },
  });
}
