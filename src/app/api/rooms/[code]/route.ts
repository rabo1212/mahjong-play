/**
 * GET /api/rooms/[code] — 방 정보 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const authHeader = req.headers.get('authorization');
  const supabase = createAuthenticatedClient(authHeader);

  // 방 조회
  const { data: room, error } = await supabase
    .from('mahjong_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !room) {
    return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });
  }

  // 참가자 조회
  const { data: players } = await supabase
    .from('mahjong_room_players')
    .select('*')
    .eq('room_id', room.id)
    .order('seat_index');

  // 참가자 닉네임 가져오기
  const playerIds = (players || []).filter(p => !p.is_ai).map(p => p.player_id);
  const { data: profiles } = playerIds.length > 0
    ? await supabase
        .from('mahjong_profiles')
        .select('id, nickname')
        .in('id', playerIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map(p => [p.id, p.nickname]));

  const roomPlayers = (players || []).map(p => ({
    id: p.player_id,
    nickname: p.is_ai ? `AI ${p.seat_index}` : (profileMap.get(p.player_id) || '플레이어'),
    seatIndex: p.seat_index,
    isAI: p.is_ai,
    isConnected: p.is_connected,
  }));

  return NextResponse.json({
    room: {
      id: room.id,
      code: room.code,
      hostId: room.host_id,
      status: room.status,
      difficulty: room.difficulty,
      beginnerMode: room.beginner_mode,
      players: roomPlayers,
      createdAt: room.created_at,
    },
  });
}
