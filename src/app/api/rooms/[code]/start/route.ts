/**
 * POST /api/rooms/[code]/start — 게임 시작 (호스트만)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createInitialGameState, startGame } from '@/engine/game-manager';

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
  const { data: room } = await supabase
    .from('mahjong_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (!room) {
    return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });
  }

  if (room.host_id !== user.id) {
    return NextResponse.json({ error: '호스트만 시작할 수 있습니다' }, { status: 403 });
  }

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: '이미 시작된 게임입니다' }, { status: 400 });
  }

  // 현재 참가자 조회
  const { data: players } = await supabase
    .from('mahjong_room_players')
    .select('*')
    .eq('room_id', room.id)
    .order('seat_index');

  const currentPlayers = players || [];
  const takenSeats = new Set(currentPlayers.map(p => p.seat_index));

  // 빈 자리는 AI로 채우기 (supabaseAdmin으로 RLS 우회 + UUID 생성)
  for (let i = 0; i < 4; i++) {
    if (!takenSeats.has(i)) {
      await supabaseAdmin.from('mahjong_room_players').insert({
        room_id: room.id,
        player_id: crypto.randomUUID(),
        seat_index: i,
        is_ai: true,
      });
    }
  }

  // 게임 상태 초기화 (engine 재사용)
  const difficulty = room.difficulty || 'easy';
  const beginnerMode = room.beginner_mode ?? true;
  const initial = createInitialGameState(difficulty as 'easy' | 'normal' | 'hard', beginnerMode);
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

  // game_states에 저장 (service_role로)
  const { error: stateError } = await supabaseAdmin
    .from('mahjong_game_states')
    .upsert({
      room_id: room.id,
      state: gameState,
      version: 0,
    }, { onConflict: 'room_id' });

  if (stateError) {
    return NextResponse.json({ error: '게임 상태 저장 실패' }, { status: 500 });
  }

  // 방 상태를 playing으로 변경 (supabaseAdmin으로)
  await supabaseAdmin
    .from('mahjong_rooms')
    .update({ status: 'playing', updated_at: new Date().toISOString() })
    .eq('id', room.id);

  // Realtime broadcast — 채널명을 code 기반으로 통일
  await supabaseAdmin.channel(`room:${room.code}`).send({
    type: 'broadcast',
    event: 'room_update',
    payload: { status: 'playing', roomId: room.id },
  });

  return NextResponse.json({ started: true, roomId: room.id });
}
