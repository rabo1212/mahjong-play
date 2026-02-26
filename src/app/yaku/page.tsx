'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { YAKU_ARRAY } from '@/data/yaku-list';
import TileComponent from '@/components/game/TileComponent';

function getTierColor(points: number) {
  if (points >= 64) return { text: 'text-action-danger', bg: 'bg-action-danger/10 border-action-danger/20' };
  if (points >= 24) return { text: 'text-gold', bg: 'bg-gold/10 border-gold/20' };
  if (points >= 6) return { text: 'text-action-blue', bg: 'bg-action-blue/10 border-action-blue/20' };
  return { text: 'text-text-primary', bg: 'bg-base/50 border-white/5' };
}

const POINT_TIERS = [88, 64, 24, 16, 6, 2, 1];

const TIER_NAMES: Record<number, string> = {
  88: '88점 — 역만급',
  64: '64점 — 고득점',
  24: '24점 — 상급',
  16: '16점 — 중상급',
  6: '6점 — 중급',
  2: '2점 — 기본',
  1: '1점 — 기본',
};

// TileKind → TileId 변환 (표시용, 각 kind의 첫 번째 카피 사용)
function kindToDisplayId(kind: number): number {
  const suit = Math.floor(kind / 10);
  const num = kind % 10;
  if (suit >= 1 && suit <= 3) {
    // 수패: 만(1), 통(2), 삭(3)
    return (suit - 1) * 36 + (num - 1) * 4;
  }
  if (suit === 4) return 108 + (num - 1) * 4; // 풍패
  if (suit === 5) return 124 + (num - 1) * 4; // 삼원패
  if (suit === 6) return 136 + (num - 1);      // 화패 (1장씩)
  return 0;
}

export default function YakuPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return YAKU_ARRAY.filter(y => {
      // 점수 필터
      if (activeFilter !== null && y.points !== activeFilter) return false;
      // 검색
      if (q) {
        return (
          y.nameKo.toLowerCase().includes(q) ||
          y.nameCn.toLowerCase().includes(q) ||
          y.nameEn.toLowerCase().includes(q) ||
          y.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [query, activeFilter]);

  const grouped = POINT_TIERS.map(tier => ({
    points: tier,
    label: TIER_NAMES[tier],
    yaku: filtered.filter(y => y.points === tier),
  })).filter(g => g.yaku.length > 0);

  const totalShown = filtered.length;

  return (
    <main className="min-h-screen flex flex-col items-center bg-base px-4 py-8">
      <h1
        className="text-3xl sm:text-5xl font-display font-bold text-gold mb-1"
        style={{ textShadow: '0 0 30px rgba(212,168,75,0.3)' }}
      >
        MahjongPlay
      </h1>
      <p className="text-sm text-text-secondary mb-5">역 사전</p>

      {/* 검색 */}
      <div className="w-full max-w-md mb-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="역 이름, 설명 검색..."
          className="w-full px-3 py-2 rounded-lg text-sm
            bg-panel border border-white/10 text-text-primary
            placeholder:text-text-muted/50
            focus:outline-none focus:border-gold/40 transition-colors"
        />
      </div>

      {/* 점수 필터 칩 */}
      <div className="flex flex-wrap gap-1.5 mb-5 justify-center max-w-md">
        <button
          onClick={() => setActiveFilter(null)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-display cursor-pointer transition-colors border ${
            activeFilter === null
              ? 'bg-gold/20 text-gold border-gold/30'
              : 'bg-panel text-text-muted border-white/5 hover:border-white/10'
          }`}
        >
          전체
        </button>
        {POINT_TIERS.map(tier => (
          <button
            key={tier}
            onClick={() => setActiveFilter(activeFilter === tier ? null : tier)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-display cursor-pointer transition-colors border ${
              activeFilter === tier
                ? 'bg-gold/20 text-gold border-gold/30'
                : 'bg-panel text-text-muted border-white/5 hover:border-white/10'
            }`}
          >
            {tier}점
          </button>
        ))}
      </div>

      {/* 역 리스트 */}
      <div className="w-full max-w-md space-y-6">
        {grouped.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-8">
            검색 결과가 없습니다.
          </div>
        ) : (
          grouped.map(({ points, label, yaku }) => {
            const tier = getTierColor(points);

            return (
              <div key={points}>
                {/* 티어 헤더 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`font-display font-bold text-sm ${tier.text}`}>
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[10px] text-text-muted">{yaku.length}개</span>
                </div>

                {/* 역 카드들 */}
                <div className="space-y-2">
                  {yaku.map((y) => (
                    <div
                      key={y.id}
                      className={`rounded-xl border p-3 sm:p-4 ${tier.bg}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* 점수 배지 */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                          font-display font-bold text-sm ${tier.text} bg-base/40`}>
                          {y.points}
                        </div>

                        {/* 역 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className={`font-bold text-sm ${tier.text}`}>
                              {y.nameKo}
                            </span>
                            <span className="text-text-muted text-xs">
                              {y.nameCn}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {y.nameEn}
                          </p>
                          <p className="text-xs text-text-secondary mt-1.5">
                            {y.description}
                          </p>
                        </div>
                      </div>

                      {/* 예시 패 */}
                      {y.exampleTiles && y.exampleTiles.length > 0 && (
                        <div className="flex gap-0.5 flex-wrap mt-2.5 pt-2 border-t border-white/5">
                          {y.exampleTiles.map((kind, i) => (
                            <TileComponent
                              key={`${y.id}-${i}`}
                              tileId={kindToDisplayId(kind)}
                              size="xs"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 하단 정보 */}
      <p className="text-[10px] text-text-muted mt-6 text-center">
        MCR (국표마작) 기준 · {totalShown}/{YAKU_ARRAY.length}개 역
      </p>

      {/* 하단 링크 */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => router.push('/')}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          &larr; 홈으로
        </button>
        <button
          onClick={() => router.push('/lobby')}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          &larr; 로비로
        </button>
      </div>
    </main>
  );
}
