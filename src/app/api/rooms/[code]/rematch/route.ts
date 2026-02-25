/**
 * POST /api/rooms/[code]/rematch — 다시하기
 * 같은 방에서 새 게임을 시작 (참가자 유지)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createInitialGameState, startGame } from '@/engine/game-manager';
import { processStartAITurns, setDeadlineIfNeeded } from '@/lib/ai-turn-processor';
import type { GameState } from '@/engine/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const authHeader = req.headers.get('authorization');
  const supabase = createAuthenticatedClient(authHeader);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  // 방 조회
  const { data: room } = await supabaseAdmin
    .from('mahjong_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (!room) {
    return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });
  }

  // 호스트만 리매치 가능
  if (room.host_id !== user.id) {
    return NextResponse.json({ error: '호스트만 다시하기를 할 수 있습니다' }, { status: 403 });
  }

  // finished 상태에서만 리매치 가능
  if (room.status !== 'finished') {
    return NextResponse.json({ error: '게임이 끝나지 않았습니다' }, { status: 400 });
  }

  // 새 게임 상태 생성
  const difficulty = room.difficulty || 'easy';
  const beginnerMode = room.beginner_mode ?? true;
  const initial = createInitialGameState(
    difficulty as 'easy' | 'normal' | 'hard',
    beginnerMode
  );
  const gameState = startGame(initial);

  // DB 참가자 정보로 isAI + 이름 패치
  const { data: allPlayers } = await supabaseAdmin
    .from('mahjong_room_players')
    .select('seat_index, is_ai, player_id')
    .eq('room_id', room.id);

  if (allPlayers) {
    const humanIds = allPlayers.filter(p => !p.is_ai).map(p => p.player_id);
    const { data: profiles } = humanIds.length > 0
      ? await supabaseAdmin
          .from('mahjong_profiles')
          .select('id, nickname')
          .in('id', humanIds)
      : { data: [] };

    const windNames = ['東', '南', '西', '北'];
    for (const p of allPlayers) {
      gameState.players[p.seat_index].isAI = p.is_ai;
      if (!p.is_ai) {
        const profile = profiles?.find(pr => pr.id === p.player_id);
        gameState.players[p.seat_index].name = profile?.nickname || 'Player';
      } else {
        gameState.players[p.seat_index].name = `AI (${windNames[p.seat_index]})`;
      }
    }
  }

  // 첫 턴이 AI이면 AI 턴 처리
  let finalState: GameState = gameState;
  if (finalState.players[finalState.turnIndex].isAI) {
    finalState = processStartAITurns(finalState);
  }

  // phase에 맞는 타이머 설정 (discard 30초, action-pending 15초)
  finalState = setDeadlineIfNeeded(finalState);

  // game_states 덮어쓰기
  const { error: stateError } = await supabaseAdmin
    .from('mahjong_game_states')
    .upsert({
      room_id: room.id,
      state: finalState,
      version: 0,
    }, { onConflict: 'room_id' });

  if (stateError) {
    return NextResponse.json({ error: '게임 상태 저장 실패' }, { status: 500 });
  }

  // 방 상태를 playing으로 복원
  await supabaseAdmin
    .from('mahjong_rooms')
    .update({ status: 'playing', updated_at: new Date().toISOString() })
    .eq('id', room.id);

  // Realtime broadcast — 모든 플레이어에게 새 게임 알림
  await supabaseAdmin.channel(`room:${room.code}`).send({
    type: 'broadcast',
    event: 'room_update',
    payload: { status: 'rematch', roomId: room.id },
  });

  return NextResponse.json({ started: true, roomId: room.id });
}
