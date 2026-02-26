'use client';

import { useRouter } from 'next/navigation';
import { YAKU_ARRAY } from '@/data/yaku-list';

function getTierColor(points: number) {
  if (points >= 64) return { text: 'text-action-danger', bg: 'bg-action-danger/10 border-action-danger/20' };
  if (points >= 24) return { text: 'text-gold', bg: 'bg-gold/10 border-gold/20' };
  if (points >= 6) return { text: 'text-action-blue', bg: 'bg-action-blue/10 border-action-blue/20' };
  return { text: 'text-text-primary', bg: 'bg-base/50 border-white/5' };
}

// 점수별 그룹핑
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

export default function YakuPage() {
  const router = useRouter();

  const grouped = POINT_TIERS.map(tier => ({
    points: tier,
    label: TIER_NAMES[tier],
    yaku: YAKU_ARRAY.filter(y => y.points === tier),
  })).filter(g => g.yaku.length > 0);

  return (
    <main className="min-h-screen flex flex-col items-center bg-base px-4 py-8">
      <h1
        className="text-3xl sm:text-5xl font-display font-bold text-gold mb-1"
        style={{ textShadow: '0 0 30px rgba(212,168,75,0.3)' }}
      >
        MahjongPlay
      </h1>
      <p className="text-sm text-text-secondary mb-8">역 사전</p>

      <div className="w-full max-w-md space-y-6">
        {grouped.map(({ points, label, yaku }) => {
          const tier = getTierColor(points);

          return (
            <div key={points}>
              {/* 티어 헤더 */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-display font-bold text-sm ${tier.text}`}>
                  {label}
                </span>
                <div className="flex-1 h-px bg-white/5" />
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
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 정보 */}
      <p className="text-[10px] text-text-muted mt-6 text-center">
        MCR (국표마작) 기준 · 총 {YAKU_ARRAY.length}개 역
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
