'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase/client';

export default function LobbyPage() {
  const router = useRouter();
  const { nickname, isAuthenticated, isLoading, signInAnonymous, restoreSession } = useAuthStore();

  const [nicknameInput, setNicknameInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  // 세션 복원
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

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

  // 방 참가
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
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
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
    <main className="min-h-screen flex flex-col items-center justify-center bg-base px-4">
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
