'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase/client';
import ProfileStatsCard from '@/components/ui/ProfileStatsCard';

interface RoomListItem {
  id: string;
  code: string;
  hostNickname: string;
  playerCount: number;
  difficulty: string;
  beginnerMode: boolean;
  createdAt: string;
}

interface ProfileStats {
  totalGames: number;
  totalWins: number;
  winRate: number;
  avgPointsPerWin: number;
  bestScore: number;
  topYaku: { nameKo: string; count: number }[];
  currentStreak: { type: 'win' | 'lose'; count: number };
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return '방금 전';
  const min = Math.floor(diff / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  return `${day}일 전`;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

export default function LobbyPage() {
  const router = useRouter();
  const { nickname, isAuthenticated, isLoading, signInAnonymous, restoreSession, changeNickname, signOut } = useAuthStore();

  const [nicknameInput, setNicknameInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  // 방 생성 설정
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('easy');
  const [beginnerMode, setBeginnerMode] = useState(true);

  // 방 목록
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);
  const [filterBeginner, setFilterBeginner] = useState(false);

  // 닉네임 변경
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nickChanging, setNickChanging] = useState(false);

  // 프로필 통계
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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

  // 프로필 통계 가져오기
  const fetchProfileStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/profile/stats', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProfileStats(data.stats);
      }
    } catch {
      // 무시
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 로그인 후 방 목록 폴링 (10초) + 통계 1회 로드
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchRooms();
    fetchProfileStats();
    const interval = setInterval(fetchRooms, 10_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchRooms, fetchProfileStats]);

  // 닉네임 입력 후 익명 로그인
  const handleLogin = async () => {
    const name = nicknameInput.trim() || '플레이어';
    await signInAnonymous(name);
  };

  // 닉네임 변경
  const handleChangeNickname = async () => {
    const name = newNickname.trim();
    if (!name || name === nickname) {
      setEditingNickname(false);
      return;
    }
    setNickChanging(true);
    const ok = await changeNickname(name);
    setNickChanging(false);
    if (ok) {
      setEditingNickname(false);
    } else {
      setError('닉네임 변경에 실패했습니다');
    }
  };

  // 로그아웃
  const handleSignOut = async () => {
    await signOut();
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
        body: JSON.stringify({ difficulty, beginnerMode }),
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

  const filteredRooms = filterBeginner ? rooms.filter(r => r.beginnerMode) : rooms;

  // 로그인 완료 → 로비
  return (
    <main className="min-h-screen flex flex-col items-center bg-base px-4 py-8">
      <h1 className="text-3xl sm:text-5xl font-display font-bold text-gold mb-1"
        style={{ textShadow: '0 0 30px rgba(212,168,75,0.3)' }}>
        MahjongPlay
      </h1>
      <p className="text-sm text-text-secondary mb-8">온라인 대전</p>

      {/* 유저 정보 */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {editingNickname ? (
          <>
            <input
              type="text"
              maxLength={10}
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleChangeNickname();
                if (e.key === 'Escape') setEditingNickname(false);
              }}
              autoFocus
              className="px-2 py-1 rounded bg-panel-light border border-gold/30
                text-sm text-gold font-semibold text-center w-28
                focus:outline-none focus:border-gold/60 transition-colors"
            />
            <button
              onClick={handleChangeNickname}
              disabled={nickChanging}
              className="text-[10px] text-gold hover:text-gold-light transition-colors cursor-pointer disabled:opacity-50"
            >
              {nickChanging ? '...' : '확인'}
            </button>
            <button
              onClick={() => setEditingNickname(false)}
              className="text-[10px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
            >
              취소
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-text-muted">접속 중: </span>
            <span className="text-sm text-gold font-semibold">{nickname}</span>
            <button
              onClick={() => { setNewNickname(nickname); setEditingNickname(true); }}
              className="text-[10px] text-text-muted hover:text-gold transition-colors cursor-pointer"
            >
              변경
            </button>
            <span className="text-white/10">|</span>
            <button
              onClick={handleSignOut}
              className="text-[10px] text-text-muted hover:text-action-danger transition-colors cursor-pointer"
            >
              로그아웃
            </button>
          </>
        )}
      </div>

      {/* 프로필 통계 카드 */}
      <div className="mb-2">
        <ProfileStatsCard stats={profileStats} loading={statsLoading} />
      </div>
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => router.push('/leaderboard')}
          className="text-xs text-text-muted hover:text-gold transition-colors cursor-pointer"
        >
          랭킹 보기 →
        </button>
        <button
          onClick={() => router.push('/history')}
          className="text-xs text-text-muted hover:text-gold transition-colors cursor-pointer"
        >
          전적 보기 →
        </button>
      </div>

      <div className="bg-panel rounded-2xl border border-white/5 shadow-panel p-6 w-full max-w-sm space-y-4">
        {/* 난이도 선택 */}
        <div>
          <label className="block text-xs text-text-secondary mb-2">난이도</label>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'normal', 'hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer
                  ${difficulty === d
                    ? 'bg-gold/20 text-gold border border-gold/40'
                    : 'bg-panel-light text-text-muted border border-white/5 hover:border-white/10'
                  }`}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        {/* 초보자 모드 토글 */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary">초보자 모드</span>
            <p className="text-[10px] text-text-muted mt-0.5">8점 미만 역도 화료 가능</p>
          </div>
          <button
            onClick={() => setBeginnerMode(!beginnerMode)}
            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer
              ${beginnerMode ? 'bg-gold/40' : 'bg-white/10'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all
              ${beginnerMode ? 'left-5 bg-gold' : 'left-0.5 bg-text-muted'}`}
            />
          </button>
        </div>

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterBeginner(!filterBeginner)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors cursor-pointer
                ${filterBeginner
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-white/5 text-text-muted border border-white/5 hover:border-white/10'
                }`}
            >
              초보 방만
            </button>
            <button
              onClick={fetchRooms}
              disabled={roomsLoading}
              className="text-xs text-text-muted hover:text-gold transition-colors cursor-pointer disabled:opacity-50"
            >
              {roomsLoading ? '새로고침 중...' : '새로고침'}
            </button>
          </div>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="bg-panel rounded-xl border border-white/5 p-6 text-center">
            <p className="text-sm text-text-muted">
              {filterBeginner ? '초보자 방이 없습니다.' : '대기 중인 방이 없습니다.'}
            </p>
            <p className="text-xs text-text-muted mt-1">
              새로 만들어보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRooms.map((room) => (
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
