/**
 * GET /api/history — 내 최근 게임 기록 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface HistoryPlayer {
  playerId: string;
  seatIndex: number;
  isAI: boolean;
  name: string;
}

interface HistoryResult {
  winner: number | null;
  isTsumo: boolean;
  totalPoints: number;
  yakuList: { nameKo: string; nameCn: string; points: number }[];
  isDraw: boolean;
}

interface HistoryRow {
  id: string;
  played_at: string;
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

  // 최근 100개에서 내가 참가한 기록 필터 (JSONB 배열 검색)
  const { data: rows, error } = await supabaseAdmin
    .from('mahjong_game_history')
    .select('id, played_at, winner_id, players, result')
    .order('played_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: '기록 조회 실패' }, { status: 500 });
  }

  const history = (rows as HistoryRow[] || [])
    .filter(row =>
      Array.isArray(row.players) &&
      row.players.some((p: HistoryPlayer) => p.playerId === user.id)
    )
    .slice(0, 30)
    .map(row => ({
      id: row.id,
      playedAt: row.played_at,
      isMyWin: row.winner_id === user.id,
      isDraw: row.result?.isDraw ?? false,
      totalPoints: row.result?.totalPoints ?? 0,
      yakuList: row.result?.yakuList ?? [],
      players: row.players,
      winnerSeat: row.result?.winner ?? null,
      isTsumo: row.result?.isTsumo ?? false,
    }));

  return NextResponse.json({ history });
}
