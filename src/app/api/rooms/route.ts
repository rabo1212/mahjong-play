/**
 * POST /api/rooms — 방 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateRoomCode } from '@/lib/room-code';

const VALID_DIFFICULTIES = ['easy', 'normal', 'hard'];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const supabase = createAuthenticatedClient(authHeader);

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const difficulty = VALID_DIFFICULTIES.includes(body.difficulty) ? body.difficulty : 'easy';
  const beginnerMode = body.beginnerMode ?? true;

  // 코드 생성 (충돌 시 재시도 최대 5회)
  let code = '';
  let codeFound = false;
  for (let i = 0; i < 5; i++) {
    code = generateRoomCode();
    const { data: existing } = await supabaseAdmin
      .from('mahjong_rooms')
      .select('id')
      .eq('code', code)
      .single();
    if (!existing) { codeFound = true; break; }
  }

  if (!codeFound) {
    return NextResponse.json({ error: '방 코드 생성 실패. 다시 시도해주세요.' }, { status: 500 });
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
    return NextResponse.json({ error: '방 생성 실패' }, { status: 500 });
  }

  // 호스트를 seat 0에 자동 참가
  const { error: joinError } = await supabase.from('mahjong_room_players').insert({
    room_id: room.id,
    player_id: user.id,
    seat_index: 0,
    is_ai: false,
  });

  if (joinError) {
    // 방은 만들어졌지만 참가 실패 → 방 정리
    await supabase.from('mahjong_rooms').delete().eq('id', room.id);
    return NextResponse.json({ error: '방 생성 실패. 다시 시도해주세요.' }, { status: 500 });
  }

  return NextResponse.json({ room: { id: room.id, code: room.code } });
}
