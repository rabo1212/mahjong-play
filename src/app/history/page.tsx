'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase/client';

interface HistoryPlayer {
  playerId: string;
  seatIndex: number;
  isAI: boolean;
  name: string;
}

interface HistoryEntry {
  id: string;
  playedAt: string;
  isMyWin: boolean;
  isDraw: boolean;
  totalPoints: number;
  yakuList: { nameKo: string; nameCn: string; points: number }[];
  players: HistoryPlayer[];
  winnerSeat: number | null;
  isTsumo: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${month}월 ${day}일 ${hour}:${min}`;
}

function getOpponents(players: HistoryPlayer[], myId: string | null): string {
  const others = players.filter(p => p.playerId !== myId);
  if (others.length === 0) return '';
  return others.map(p => p.name).join(', ');
}

export default function HistoryPage() {
  const router = useRouter();
  const { userId, isAuthenticated, isLoading, restoreSession } = useAuthStore();

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/lobby');
      return;
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/history', {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        const data = await res.json();
        if (res.ok) setEntries(data.history || []);
      } catch {
        // 무시
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="min-h-screen flex flex-col items-center bg-base px-4 py-8">
      <h1
        className="text-3xl sm:text-5xl font-display font-bold text-gold mb-1"
        style={{ textShadow: '0 0 30px rgba(212,168,75,0.3)' }}
      >
        MahjongPlay
      </h1>
      <p className="text-sm text-text-secondary mb-8">전적</p>

      <div className="w-full max-w-md space-y-2">
        {/* 로딩 스켈레톤 */}
        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-panel rounded-xl border border-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
                    <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
                  </div>
                  <div className="h-5 bg-white/5 rounded animate-pulse w-12" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && entries.length === 0 && (
          <div className="bg-panel rounded-2xl border border-white/5 shadow-panel py-12 text-center">
            <p className="text-sm text-text-muted">아직 전적이 없습니다.</p>
            <p className="text-xs text-text-muted mt-1">온라인 대국을 시작해보세요!</p>
          </div>
        )}

        {/* 전적 목록 */}
        {!loading && entries.map((entry) => {
          const resultLabel = entry.isDraw ? '유국' : entry.isMyWin ? '승' : '패';
          const resultColor = entry.isDraw
            ? 'bg-white/5 text-text-muted'
            : entry.isMyWin
              ? 'bg-gold/15 text-gold'
              : 'bg-action-danger/15 text-action-danger';
          const winType = entry.isDraw ? '' : entry.isTsumo ? '쯔모' : '론';
          const yakuNames = entry.yakuList.map(y => y.nameKo).join(', ');
          const opponents = getOpponents(entry.players, userId);

          return (
            <div
              key={entry.id}
              className="bg-panel rounded-xl border border-white/5 p-4 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* 결과 배지 */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                  font-display font-bold text-sm ${resultColor}`}>
                  {resultLabel}
                </div>

                {/* 중앙: 날짜 + 상대 + 역 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      {formatDate(entry.playedAt)}
                    </span>
                  </div>
                  {opponents && (
                    <p className="text-[11px] text-text-muted mt-0.5 truncate">
                      vs {opponents}
                    </p>
                  )}
                  {!entry.isDraw && yakuNames && (
                    <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                      {yakuNames}
                    </p>
                  )}
                </div>

                {/* 우측: 점수 + 쯔모/론 */}
                {!entry.isDraw && (
                  <div className="flex-shrink-0 text-right">
                    <div className={`font-display font-bold text-sm ${
                      entry.isMyWin ? 'text-gold' : 'text-text-secondary'
                    }`}>
                      {entry.totalPoints}점
                    </div>
                    {winType && (
                      <div className="text-[10px] text-text-muted">{winType}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 링크 */}
      <button
        onClick={() => router.push('/lobby')}
        className="mt-6 text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
      >
        &larr; 로비로 돌아가기
      </button>
    </main>
  );
}
