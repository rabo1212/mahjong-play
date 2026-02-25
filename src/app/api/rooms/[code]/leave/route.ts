/**
 * POST /api/rooms/[code]/leave — 방 퇴장
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

  // 대기 중: 호스트 나가면 방 삭제, 일반은 본인만 삭제
  if (room.status === 'waiting') {
    if (room.host_id === user.id) {
      await supabaseAdmin.from('mahjong_rooms').delete().eq('id', room.id);
      return NextResponse.json({ disbanded: true });
    }
    await supabase
      .from('mahjong_room_players')
      .delete()
      .eq('room_id', room.id)
      .eq('player_id', user.id);
    return NextResponse.json({ left: true });
  }

  // 게임 중 또는 종료: 본인만 room_players에서 삭제 (방/기록은 보존)
  if (room.status === 'playing' || room.status === 'finished') {
    await supabaseAdmin
      .from('mahjong_room_players')
      .delete()
      .eq('room_id', room.id)
      .eq('player_id', user.id);
    return NextResponse.json({ left: true });
  }

  return NextResponse.json({ error: '나갈 수 없는 상태입니다' }, { status: 400 });
}
