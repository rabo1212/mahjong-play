/**
 * POST /api/rooms/[code]/join — 방 참가
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';

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

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: '이미 시작된 게임입니다' }, { status: 400 });
  }

  // 이미 참가 중인지 확인
  const { data: existing } = await supabase
    .from('mahjong_room_players')
    .select('id')
    .eq('room_id', room.id)
    .eq('player_id', user.id)
    .single();

  if (existing) {
    return NextResponse.json({ room: { id: room.id, code: room.code } });
  }

  // 현재 참가자 수 확인
  const { data: players } = await supabase
    .from('mahjong_room_players')
    .select('seat_index')
    .eq('room_id', room.id)
    .order('seat_index');

  const takenSeats = new Set((players || []).map(p => p.seat_index));
  if (takenSeats.size >= 4) {
    return NextResponse.json({ error: '방이 가득 찼습니다' }, { status: 400 });
  }

  // 빈 좌석 찾기
  let seatIndex = 0;
  for (let i = 0; i < 4; i++) {
    if (!takenSeats.has(i)) { seatIndex = i; break; }
  }

  const { error: joinError } = await supabase
    .from('mahjong_room_players')
    .insert({
      room_id: room.id,
      player_id: user.id,
      seat_index: seatIndex,
      is_ai: false,
    });

  if (joinError) {
    return NextResponse.json({ error: '참가 실패: ' + joinError.message }, { status: 500 });
  }

  return NextResponse.json({ room: { id: room.id, code: room.code }, seatIndex });
}
