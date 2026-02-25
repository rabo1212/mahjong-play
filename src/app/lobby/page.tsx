'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase/client';

interface RoomListItem {
  id: string;
  code: string;
  hostNickname: string;
  playerCount: number;
  difficulty: string;
  beginnerMode: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return '방금 전';
  const min = Math.floor(diff / 60);
  return `${min}분 전`;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

export default function LobbyPage() {
  const router = useRouter();
  const { nickname, isAuthenticated, isLoading, signInAnonymous, restoreSession } = useAuthStore();

  const [nicknameInput, setNicknameInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  // 방 목록
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);

  // 세션 복원
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // 방 목록 가져오기
  const fetchRooms = useCallback(async () => {
    try {
      setRoomsLoading(true);
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms || []);
      }
    } catch {
      // 폴링이므로 다음에 재시도
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  // 로그인 후 방 목록 폴링 (10초)
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchRooms();
    const interval = setInterval(fetchRooms, 10_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchRooms]);

  // 닉네임 입력 후 익명 로그인
  const handleLogin = async () => {
    const name = nicknameInput.trim() || '플레이어';
    await signInAnonymous(name);
  };

  // 방 생성
  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ difficulty: 'easy', beginnerMode: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/room/${data.room.code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '방 생성 실패');
    } finally {
      setCreating(false);
    }
  };

  // 코드로 참가
  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) {
      setError('4자리 코드를 입력해주세요');
      return;
    }
    setJoining(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/room/${code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '참가 실패');
    } finally {
      setJoining(false);
    }
  };

  // 방 카드 클릭으로 참가
  const handleJoinRoom = async (roomCode: string) => {
    setJoiningRoomCode(roomCode);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/room/${roomCode}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '참가 실패');
    } finally {
      setJoiningRoomCode(null);
    }
  };

  // 로딩 중
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-text-muted animate-pulse">로딩 중...</div>
      </main>
    );
  }

  // 미로그인 → 닉네임 입력
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-base px-4">
        <h1 className="text-3xl sm:text-5xl font-display font-bold text-gold mb-2"
          style={{ textShadow: '0 0 30px rgba(212,168,75,0.3)' }}>
          MahjongPlay
        </h1>
        <p className="text-sm text-text-secondary mb-8">온라인 대전</p>

        <div className="bg-panel rounded-2xl border border-white/5 shadow-panel p-6 w-full max-w-sm">
          <label className="block text-xs text-text-secondary mb-2">닉네임</label>
          <input
            type="text"
            maxLength={10}
            placeholder="닉네임을 입력하세요"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 rounded-lg bg-panel-light border border-white/10
              text-text-primary placeholder-text-muted text-sm
              focus:outline-none focus:border-gold/40 transition-colors"
          />
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full mt-4 py-3 rounded-xl font-bold text-base transition-all cursor-pointer
              bg-gradient-to-r from-gold-dark via-gold to-gold-light text-text-on-gold
              hover:shadow-gold-glow active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? '접속 중...' : '시작하기'}
          </button>
        </div>

        <button
          onClick={() => router.push('/')}
          className="mt-6 text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          ← AI 대전으로 돌아가기
        </button>
      </main>
    );
  }

  // 로그인 완료 → 로비
  return (
    <main className="min-h-screen flex flex-col items-center bg-base px-4 py-8">
      <h1 className="text-3xl sm:text-5xl font-display font-bold text-gold mb-1"
        style={{ textShadow: '0 0 30px rgba(212,168,75,0.3)' }}>
        MahjongPlay
      </h1>
      <p className="text-sm text-text-secondary mb-8">온라인 대전</p>

      {/* 유저 정보 */}
      <div className="mb-6 text-center">
        <span className="text-xs text-text-muted">접속 중: </span>
        <span className="text-sm text-gold font-semibold">{nickname}</span>
      </div>

      <div className="bg-panel rounded-2xl border border-white/5 shadow-panel p-6 w-full max-w-sm space-y-4">
        {/* 방 만들기 */}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-3.5 rounded-xl font-bold text-base transition-all cursor-pointer
            bg-gradient-to-r from-gold-dark via-gold to-gold-light text-text-on-gold
            hover:shadow-gold-glow active:scale-[0.98] disabled:opacity-50"
        >
          {creating ? '생성 중...' : '방 만들기'}
        </button>

        {/* 구분선 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-xs text-text-muted">또는</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* 코드로 참가 */}
        <div>
          <label className="block text-xs text-text-secondary mb-2">방 코드로 참가</label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={4}
              placeholder="ABCD"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="flex-1 px-4 py-3 rounded-lg bg-panel-light border border-white/10
                text-text-primary placeholder-text-muted text-center text-lg font-display
                tracking-[0.3em] uppercase
                focus:outline-none focus:border-gold/40 transition-colors"
            />
            <button
              onClick={handleJoin}
              disabled={joining || joinCode.length !== 4}
              className="px-5 py-3 rounded-lg font-semibold text-sm transition-all cursor-pointer
                bg-action-blue/20 text-action-blue border border-action-blue/30
                hover:bg-action-blue/30 active:scale-[0.98]
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {joining ? '...' : '참가'}
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p className="text-xs text-action-danger text-center animate-fade-in">{error}</p>
        )}
      </div>

      {/* 대기 중인 방 목록 */}
      <div className="w-full max-w-sm mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-secondary">
            대기 중인 방
          </h2>
          <button
            onClick={fetchRooms}
            disabled={roomsLoading}
            className="text-xs text-text-muted hover:text-gold transition-colors cursor-pointer disabled:opacity-50"
          >
            {roomsLoading ? '새로고침 중...' : '새로고침'}
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="bg-panel rounded-xl border border-white/5 p-6 text-center">
            <p className="text-sm text-text-muted">
              대기 중인 방이 없습니다.
            </p>
            <p className="text-xs text-text-muted mt-1">
              새로 만들어보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleJoinRoom(room.code)}
                disabled={joiningRoomCode !== null}
                className="w-full bg-panel rounded-xl border border-white/5 hover:border-gold/20
                  p-4 text-left transition-all cursor-pointer
                  hover:bg-panel-light active:scale-[0.99]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-gold text-sm tracking-wider">
                      {room.code}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-text-muted">
                      {DIFFICULTY_LABELS[room.difficulty] || room.difficulty}
                    </span>
                    {room.beginnerMode && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/10 text-gold">
                        초보
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-text-muted">
                    {timeAgo(room.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">
                    {room.hostNickname}
                  </span>
                  <span className="text-xs font-display">
                    <span className="text-gold font-semibold">{room.playerCount}</span>
                    <span className="text-text-muted">/4</span>
                  </span>
                </div>
                {joiningRoomCode === room.code && (
                  <div className="text-xs text-gold mt-1 animate-pulse">참가 중...</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 하단 링크 */}
      <button
        onClick={() => router.push('/')}
        className="mt-6 text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
      >
        ← AI 대전으로 돌아가기
      </button>
    </main>
  );
}
