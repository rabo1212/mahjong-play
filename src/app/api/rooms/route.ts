/**
 * POST /api/rooms — 방 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';
import { generateRoomCode } from '@/lib/room-code';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const supabase = createAuthenticatedClient(authHeader);

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const difficulty = body.difficulty || 'easy';
  const beginnerMode = body.beginnerMode ?? true;

  // 코드 생성 (충돌 시 재시도 최대 5회)
  let code = '';
  for (let i = 0; i < 5; i++) {
    code = generateRoomCode();
    const { data: existing } = await supabase
      .from('mahjong_rooms')
      .select('id')
      .eq('code', code)
      .single();
    if (!existing) break;
  }

  // 방 생성
  const { data: room, error: roomError } = await supabase
    .from('mahjong_rooms')
    .insert({
      code,
      host_id: user.id,
      status: 'waiting',
      difficulty,
      beginner_mode: beginnerMode,
    })
    .select()
    .single();

  if (roomError) {
    return NextResponse.json({ error: '방 생성 실패: ' + roomError.message }, { status: 500 });
  }

  // 호스트를 seat 0에 자동 참가
  await supabase.from('mahjong_room_players').insert({
    room_id: room.id,
    player_id: user.id,
    seat_index: 0,
    is_ai: false,
  });

  return NextResponse.json({ room: { id: room.id, code: room.code } });
}
