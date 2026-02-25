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

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: '게임 중에는 나갈 수 없습니다' }, { status: 400 });
  }

  // 호스트가 나가면 방 전체 삭제 (supabaseAdmin으로 RLS 우회)
  if (room.host_id === user.id) {
    // CASCADE로 room_players도 자동 삭제됨
    await supabaseAdmin.from('mahjong_rooms').delete().eq('id', room.id);
    return NextResponse.json({ disbanded: true });
  }

  // 일반 참가자 퇴장 (본인 row만 삭제 — RLS OK)
  await supabase
    .from('mahjong_room_players')
    .delete()
    .eq('room_id', room.id)
    .eq('player_id', user.id);

  return NextResponse.json({ left: true });
}
