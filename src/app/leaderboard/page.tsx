'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  totalGames: number;
  totalWins: number;
  winRate: number;
}

const RANK_STYLES: Record<number, string> = {
  1: 'text-gold',
  2: 'text-[#C0C0C0]',
  3: 'text-[#CD7F32]',
};

export default function LeaderboardPage() {
  const router = useRouter();
  const { nickname } = useAuthStore();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        if (res.ok) setEntries(data.leaderboard || []);
      } catch {
        // 무시
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center bg-base px-4 py-8">
      <h1
        className="text-3xl sm:text-5xl font-display font-bold text-gold mb-1"
        style={{ textShadow: '0 0 30px rgba(212,168,75,0.3)' }}
      >
        MahjongPlay
      </h1>
      <p className="text-sm text-text-secondary mb-8">랭킹</p>

      <div className="bg-panel rounded-2xl border border-white/5 shadow-panel w-full max-w-md overflow-hidden">
        {/* 테이블 헤더 */}
        <div className="grid grid-cols-[2.5rem_1fr_3rem_3rem_3.5rem] gap-2 px-4 py-3 border-b border-white/5 text-[10px] text-text-muted">
          <span>#</span>
          <span>닉네임</span>
          <span className="text-right">승</span>
          <span className="text-right">대국</span>
          <span className="text-right">승률</span>
        </div>

        {/* 로딩 스켈레톤 */}
        {loading && (
          <div className="divide-y divide-white/5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-[2.5rem_1fr_3rem_3rem_3.5rem] gap-2 px-4 py-3">
                <div className="h-4 bg-white/5 rounded animate-pulse" />
                <div className="h-4 bg-white/5 rounded animate-pulse w-2/3" />
                <div className="h-4 bg-white/5 rounded animate-pulse" />
                <div className="h-4 bg-white/5 rounded animate-pulse" />
                <div className="h-4 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && entries.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">아직 랭킹이 없습니다.</p>
            <p className="text-xs text-text-muted mt-1">첫 대국을 시작해보세요!</p>
          </div>
        )}

        {/* 랭킹 목록 */}
        {!loading && entries.length > 0 && (
          <div className="divide-y divide-white/5">
            {entries.map((entry) => {
              const isMe = nickname === entry.nickname;
              const rankColor = RANK_STYLES[entry.rank] || 'text-text-muted';

              return (
                <div
                  key={entry.rank}
                  className={`grid grid-cols-[2.5rem_1fr_3rem_3rem_3.5rem] gap-2 px-4 py-3 transition-colors ${
                    isMe ? 'bg-gold/10' : ''
                  }`}
                >
                  <span className={`font-display font-bold ${rankColor}`}>
                    {entry.rank}
                  </span>
                  <span className={`text-sm truncate ${
                    isMe ? 'text-gold font-semibold' : 'text-text-primary'
                  }`}>
                    {entry.nickname}
                    {isMe && (
                      <span className="ml-1 text-[10px] text-gold/60">나</span>
                    )}
                  </span>
                  <span className="text-sm text-text-secondary text-right font-display">
                    {entry.totalWins}
                  </span>
                  <span className="text-sm text-text-muted text-right font-display">
                    {entry.totalGames}
                  </span>
                  <span className="text-sm text-text-secondary text-right font-display">
                    {entry.winRate}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 링크 */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={() => router.push('/lobby')}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          &larr; 로비로
        </button>
        <button
          onClick={() => router.push('/')}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          &larr; 홈으로
        </button>
      </div>
    </main>
  );
}
