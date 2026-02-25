'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase/client';
import type { RoomInfo, RoomPlayer } from '@/lib/online-types';

export default function WaitingRoomPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();
  const { userId } = useAuthStore();

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');

  const fetchRoom = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/rooms/${code}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoom(data.room);

      // 게임 시작되었으면 게임 페이지로 이동
      if (data.room.status === 'playing') {
        router.push(`/game?mode=online&roomId=${data.room.id}&code=${code}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '방 정보를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, [code, router]);

  // 초기 로드 + Realtime 구독
  useEffect(() => {
    fetchRoom();

    // Realtime으로 방 업데이트 구독
    const channel = supabase.channel(`room:${code}`)
      .on('broadcast', { event: 'room_update' }, (payload) => {
        if (payload.payload?.status === 'playing') {
          // 게임 시작 알림
          fetchRoom();
        }
      })
      .subscribe();

    // 5초마다 폴링 (Realtime 백업)
    const interval = setInterval(fetchRoom, 5000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [code, fetchRoom]);

  // 게임 시작
  const handleStart = async () => {
    setStarting(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/game?mode=online&roomId=${data.roomId}&code=${code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '시작 실패');
    } finally {
      setStarting(false);
    }
  };

  // 방 나가기
  const handleLeave = async () => {
    setLeaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/rooms/${code}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      router.push('/lobby');
    } catch {
      router.push('/lobby');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-text-muted animate-pulse">방 정보 로딩 중...</div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-base px-4">
        <p className="text-action-danger mb-4">{error || '방을 찾을 수 없습니다'}</p>
        <button
          onClick={() => router.push('/lobby')}
          className="text-sm text-text-secondary hover:text-gold transition-colors cursor-pointer"
        >
          로비로 돌아가기
        </button>
      </main>
    );
  }

  const isHost = room.hostId === userId;
  const humanCount = room.players.filter(p => !p.isAI).length;
  const seatLabels = ['東 (동)', '南 (남)', '西 (서)', '北 (북)'];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-base px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gold mb-1"
          style={{ textShadow: '0 0 20px rgba(212,168,75,0.3)' }}>
          대기실
        </h1>
        <p className="text-text-secondary text-sm">방 코드</p>
        <div className="mt-2 inline-block bg-panel-light rounded-xl px-6 py-3 border border-gold/20">
          <span className="text-3xl font-display font-bold text-gold tracking-[0.3em]">
            {room.code}
          </span>
        </div>
        <p className="text-[10px] text-text-muted mt-2">이 코드를 친구에게 공유하세요</p>
      </div>

      {/* 좌석 현황 */}
      <div className="bg-panel rounded-2xl border border-white/5 shadow-panel p-5 sm:p-6 w-full max-w-sm mb-4">
        <div className="text-xs text-text-muted mb-3">
          플레이어 ({humanCount}/4)
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((seatIdx) => {
            const player = room.players.find(p => p.seatIndex === seatIdx);
            return (
              <SeatSlot
                key={seatIdx}
                seatLabel={seatLabels[seatIdx]}
                player={player}
                isCurrentUser={player?.id === userId}
                isHost={player?.id === room.hostId}
              />
            );
          })}
        </div>
      </div>

      {/* 설정 정보 */}
      <div className="bg-panel/60 rounded-xl border border-white/5 px-5 py-3 w-full max-w-sm mb-6">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">난이도</span>
          <span className="text-text-secondary">
            {room.difficulty === 'easy' ? '쉬움' : room.difficulty === 'normal' ? '보통' : '어려움'}
          </span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-text-muted">초보자 모드</span>
          <span className="text-text-secondary">{room.beginnerMode ? 'ON' : 'OFF'}</span>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <p className="text-xs text-action-danger mb-4 animate-fade-in">{error}</p>
      )}

      {/* 버튼들 */}
      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer
            bg-panel-light text-text-secondary border border-white/5
            hover:border-white/10 hover:text-text-primary active:scale-[0.98]
            disabled:opacity-50"
        >
          {leaving ? '나가는 중...' : '나가기'}
        </button>

        {isHost && (
          <button
            onClick={handleStart}
            disabled={starting}
            className="flex-[2] py-3 rounded-xl font-bold text-base transition-all cursor-pointer
              bg-gradient-to-r from-gold-dark via-gold to-gold-light text-text-on-gold
              hover:shadow-gold-glow active:scale-[0.98] disabled:opacity-50"
          >
            {starting ? '시작 중...' : `게임 시작 (빈자리 AI)`}
          </button>
        )}

        {!isHost && (
          <div className="flex-[2] py-3 rounded-xl text-center text-sm text-text-muted
            bg-panel-light border border-white/5">
            호스트가 시작할 때까지 대기 중...
          </div>
        )}
      </div>
    </main>
  );
}

/** 좌석 슬롯 */
function SeatSlot({
  seatLabel,
  player,
  isCurrentUser,
  isHost,
}: {
  seatLabel: string;
  player?: RoomPlayer;
  isCurrentUser: boolean;
  isHost: boolean;
}) {
  const isEmpty = !player;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isCurrentUser
        ? 'bg-gold/10 border border-gold/20'
        : isEmpty
          ? 'bg-panel-light/50 border border-white/5 border-dashed'
          : 'bg-panel-light border border-white/5'
    }`}>
      <span className="text-xs text-text-muted w-16 font-display">{seatLabel}</span>
      {isEmpty ? (
        <span className="text-xs text-text-muted italic">빈 자리</span>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          {!player.isAI && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              player.isConnected
                ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                : 'bg-white/20'
            }`} />
          )}
          <span className={`text-sm font-semibold ${isCurrentUser ? 'text-gold' : 'text-text-primary'}`}>
            {player.nickname}
          </span>
          {isHost && (
            <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded">
              호스트
            </span>
          )}
          {isCurrentUser && !isHost && (
            <span className="text-[10px] bg-action-blue/20 text-action-blue px-1.5 py-0.5 rounded">
              나
            </span>
          )}
        </div>
      )}
    </div>
  );
}
