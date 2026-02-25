/**
 * POST /api/rooms/[code]/leave — 방 퇴장
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

  const { data: room } = await supabase
    .from('mahjong_rooms')
    .select('id, host_id, status')
    .eq('code', code.toUpperCase())
    .single();

  if (!room) {
    return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });
  }

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: '게임 중에는 나갈 수 없습니다' }, { status: 400 });
  }

  // 참가자 삭제
  await supabase
    .from('mahjong_room_players')
    .delete()
    .eq('room_id', room.id)
    .eq('player_id', user.id);

  // 호스트가 나가면 방 삭제
  if (room.host_id === user.id) {
    await supabase.from('mahjong_room_players').delete().eq('room_id', room.id);
    await supabase.from('mahjong_rooms').delete().eq('id', room.id);
    return NextResponse.json({ disbanded: true });
  }

  return NextResponse.json({ left: true });
}
