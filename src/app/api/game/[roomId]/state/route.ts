/**
 * GET /api/game/[roomId]/state — 현재 게임 상태 조회 (재접속용)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { serializeGameState } from '@/engine/dto';
import type { GameState } from '@/engine/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const authHeader = req.headers.get('authorization');
  const supabase = createAuthenticatedClient(authHeader);

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  // 참가자인지 확인 + seatIndex 가져오기
  const { data: playerRow } = await supabase
    .from('mahjong_room_players')
    .select('seat_index, is_ai')
    .eq('room_id', roomId)
    .eq('player_id', user.id)
    .single();

  if (!playerRow) {
    return NextResponse.json({ error: '이 방의 참가자가 아닙니다' }, { status: 403 });
  }

  // 재접속 시 is_connected 갱신
  await supabaseAdmin
    .from('mahjong_room_players')
    .update({ is_connected: true })
    .eq('room_id', roomId)
    .eq('player_id', user.id);

  // 게임 상태 조회 (service_role)
  const { data: gameRow } = await supabaseAdmin
    .from('mahjong_game_states')
    .select('state, version')
    .eq('room_id', roomId)
    .single();

  if (!gameRow) {
    return NextResponse.json({ error: '게임이 시작되지 않았습니다' }, { status: 404 });
  }

  const gameState = gameRow.state as GameState;
  const dto = serializeGameState(gameState, playerRow.seat_index);

  return NextResponse.json({
    state: dto,
    version: gameRow.version,
    seatIndex: playerRow.seat_index,
  });
}
